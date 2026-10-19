"""Local Jira dashboard. Reads Jira; the only write is moving a confirmed Ready for Integration task to Done. Run: python server.py."""
import argparse
import json
import os
import re
from pathlib import Path
import secrets
import ssl
import threading
import tomllib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import timezone, timedelta

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
PUBLIC = ROOT / 'public'
LOCK = threading.Lock()
SESSION_TOKEN = secrets.token_urlsafe(32)
# Match account identities from Jira, never infer a person's role from task counts.
DISPLAY_NAMES = {'Hà Quang Hải', 'Nguyễn Trọng Phương - FSEL', 'Phan Minh Phúc', 'Nguyen Huu Khoa', 'Hữu Duy - FSEL'}
try:
    LOCAL_TZ = ZoneInfo('Asia/Ho_Chi_Minh')
except ZoneInfoNotFoundError:
    LOCAL_TZ = timezone(timedelta(hours=7))


def jira_config():
    config_path = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'config.toml'
    config = tomllib.loads(config_path.read_text(encoding='utf-8')) if config_path.exists() else {}
    env = config.get('mcp_servers', {}).get('fsel-jira', {}).get('env', {})
    # Prefer the working connector as one complete credential set; unrelated
    # environment variables may point to a different Jira integration.
    source = env if env.get('JIRA_URL') and env.get('JIRA_PERSONAL_TOKEN') else os.environ
    url = source.get('JIRA_URL', '')
    token = source.get('JIRA_PERSONAL_TOKEN', '')
    verify = str(source.get('JIRA_SSL_VERIFY', 'true'))
    if not url or not token:
        raise ValueError('Chưa có JIRA_URL / JIRA_PERSONAL_TOKEN trong cấu hình fsel-jira hoặc biến môi trường.')
    return url.rstrip('/'), token, verify.lower() != 'false'


def jira_get(path, params=None):
    return jira_request('GET', path, params)


def jira_post(path, body):
    return jira_request('POST', path, body=body)


def jira_request(method, path, params=None, body=None):
    base, token, verify = jira_config()
    query = '?' + urlencode(params) if params else ''
    headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/json'}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    req = Request(base + path + query, data=data, headers=headers, method=method)
    ctx = ssl.create_default_context() if verify else ssl._create_unverified_context()
    # Follow no redirects: a redirect must never forward the Jira bearer token.
    from urllib.request import build_opener, HTTPSHandler, HTTPRedirectHandler
    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    with build_opener(HTTPSHandler(context=ctx), NoRedirect()).open(req, timeout=35) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return default


def save_json(path, value):
    DATA.mkdir(exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)


def list_sprints():
    result, start = [], 0
    while True:
        page = jira_get('/rest/agile/1.0/board/33/sprint', {'maxResults': 50, 'startAt': start})
        values = page.get('values', [])
        result.extend({k: s.get(k) for k in ['id', 'name', 'state', 'startDate', 'endDate']} for s in values)
        start += len(values)
        if page.get('isLast', True) or not values:
            break
    save_json(DATA / 'sprints.json', result)
    return result


def issue_worklogs(key, start_day, end_day):
    result, offset = [], 0
    while True:
        page = jira_get('/rest/api/2/issue/' + key + '/worklog', {'startAt': offset, 'maxResults': 100})
        values = page.get('worklogs', [])
        for w in values:
            author = w.get('author', {}).get('displayName')
            started = datetime.fromisoformat(w['started']).astimezone(LOCAL_TZ).date().isoformat()
            if author in DISPLAY_NAMES and start_day <= started <= end_day:
                result.append({'id': w['id'], 'key': key, 'author': author, 'day': started,
                               'hours': w['timeSpentSeconds'] / 3600,
                               'comment': (w.get('comment') or '').strip()[:500]})
        offset += len(values)
        if offset >= page.get('total', 0):
            break
        if not values:
            raise ValueError('Chưa tải đủ worklog của ' + key + '; giữ snapshot trước.')
    return result


START_STATUSES = {'In Progress', 'In Development'}


def first_start(changelog):
    """Time the issue first moved into an in-progress status, from Jira history."""
    for history in sorted(changelog.get('histories', []), key=lambda h: h.get('created', '')):
        if any(i.get('field') == 'status' and i.get('toString') in START_STATUSES for i in history.get('items', [])):
            return history.get('created')
    return None


def status_history(changelog):
    """Every status change, oldest first, so the UI can rebuild Pending intervals."""
    rows = [{'at': h.get('created'), 'from': i.get('fromString'), 'to': i.get('toString')}
            for h in changelog.get('histories', []) for i in h.get('items', []) if i.get('field') == 'status']
    return sorted(rows, key=lambda r: r['at'] or '')


# BE "Ready for Integration" waits on the FE / Mobile side. Those tasks hang off the same Story
# (BE task -Relates- Story -Relates- FE/Mob task) or, less often, link to the BE task directly.
INTEGRATION = 'Ready for Integration'
SIDE_LABELS = {'FE': {'frontend', 'fe', 'fe-frontend'}, 'Mob': {'mobile', 'mob', 'mobile-app'}}
WORK_TYPES = {'Task', 'Bug', 'Technical Story', 'Sub-task'}


def sides(labels):
    low = {label.lower() for label in labels or []}
    return [side for side, names in SIDE_LABELS.items() if low & names]


def search_keys(keys, fields):
    found = {}
    keys = sorted(keys)
    for i in range(0, len(keys), 50):
        chunk = keys[i:i + 50]
        page = jira_get('/rest/api/2/search', {'jql': 'key in (%s)' % ','.join(chunk), 'fields': fields, 'maxResults': 50})
        found.update({item['key']: item['fields'] for item in page.get('issues', [])})
    return found


def integration_evidence(tasks):
    """For each {'key', 'links'} task: the FE/Mob work items it waits on, with their current status."""
    linked = {link['key'] for t in tasks for link in t['links'] if link.get('key')}
    first = search_keys(linked, 'issuetype,labels,status,summary,assignee,issuelinks') if linked else {}
    stories = {k for k, f in first.items() if f['issuetype']['name'] == 'Story'}
    siblings = {}
    for story in stories:
        for link in first[story].get('issuelinks', []):
            other = (link.get('outwardIssue') or link.get('inwardIssue') or {}).get('key')
            if other:
                siblings.setdefault(story, set()).add(other)
    need = set().union(*siblings.values()) - set(first) if siblings else set()
    issues = {**first, **(search_keys(need, 'issuetype,labels,status,summary,assignee') if need else {})}

    def item(key, via):
        f = issues.get(key)
        if not f or f['issuetype']['name'] not in WORK_TYPES or not sides(f.get('labels')):
            return None
        status = f['status']
        return {'key': key, 'summary': f.get('summary'), 'type': f['issuetype']['name'], 'sides': sides(f.get('labels')),
                'status': status['name'], 'done': status.get('statusCategory', {}).get('key') == 'done',
                'assignee': (f.get('assignee') or {}).get('displayName'), 'via': via}
    result = {}
    for t in tasks:
        found = {}
        for link in t['links']:
            key = link.get('key')
            if key in stories:
                for other in sorted(siblings.get(key, ())):
                    row = other != t['key'] and item(other, key)
                    if row:
                        found.setdefault(other, row)
            elif key:
                row = item(key, None)
                if row:
                    found.setdefault(key, row)
        result[t['key']] = {'stories': sorted(k for k in (link.get('key') for link in t['links']) if k in stories),
                            'related': list(found.values())}
    return result


def ready_to_close(evidence):
    return bool(evidence['related']) and all(r['done'] for r in evidence['related'])


def close_integration(keys):
    """Move each confirmed BE Ready for Integration task to Done, re-checking Jira first."""
    results = []
    for key in keys:
        try:
            f = jira_get('/rest/api/2/issue/' + key, {'fields': 'status,labels,assignee,issuetype,issuelinks'})['fields']
            if f['status']['name'] != INTEGRATION:
                results.append({'key': key, 'ok': False, 'message': 'Status trên Jira hiện là ' + f['status']['name'] + '.'})
                continue
            if not {label.lower() for label in f.get('labels', [])} & {'backend', 'be'} \
                    or (f.get('assignee') or {}).get('displayName') not in DISPLAY_NAMES:
                results.append({'key': key, 'ok': False, 'message': 'Không phải task BE của team.'})
                continue
            links = [{'key': (link.get('outwardIssue') or link.get('inwardIssue') or {}).get('key')} for link in f.get('issuelinks', [])]
            evidence = integration_evidence([{'key': key, 'links': links}])[key]
            if not ready_to_close(evidence):
                results.append({'key': key, 'ok': False,
                                'message': 'Task FE/Mob liên quan chưa Done.' if evidence['related'] else 'Không có task FE/Mob liên quan.'})
                continue
            moves = (jira_get('/rest/api/2/issue/' + key + '/transitions') or {}).get('transitions', [])
            done = next((m for m in moves if m.get('to', {}).get('name') == 'Done'), None)
            if not done:
                results.append({'key': key, 'ok': False, 'message': 'Workflow không cho chuyển thẳng sang Done.'})
                continue
            jira_post('/rest/api/2/issue/' + key + '/transitions', {'transition': {'id': done['id']}})
            results.append({'key': key, 'ok': True, 'message': 'Đã chuyển Done.'})
        except HTTPError as error:
            results.append({'key': key, 'ok': False, 'message': f'Jira trả HTTP {error.code}.'})
        except (URLError, TimeoutError):
            results.append({'key': key, 'ok': False, 'message': 'Không kết nối được Jira.'})
    return results


def refresh(sprint_id=251):
    sprints = list_sprints()
    if sprint_id not in {s['id'] for s in sprints}:
        raise ValueError('Sprint không nằm trong FSEL Platform Board - DEV.')
    sprint = jira_get('/rest/agile/1.0/sprint/' + str(sprint_id))
    jql = f'project = FSLP AND sprint = {sprint_id} AND labels in (Backend, BE) ORDER BY key ASC'
    fields = 'summary,description,status,assignee,issuetype,timetracking,labels,priority,parent,issuelinks,customfield_10111,customfield_10700,updated'
    raw, start = [], 0
    while True:
        page = jira_get('/rest/api/2/search', {'jql': jql, 'fields': fields, 'expand': 'changelog', 'maxResults': 50, 'startAt': start})
        chunk = page.get('issues', [])
        raw.extend(chunk)
        start += len(chunk)
        if start >= page['total']:
            break
        if not chunk:
            raise ValueError('Jira trả về trang rỗng trước khi tải đủ dữ liệu; giữ snapshot cũ.')
    base = jira_config()[0]
    tasks = []
    excluded = {}
    seen = set()
    for item in raw:
        if item['key'] in seen:
            raise ValueError('Dữ liệu Jira thay đổi trong lúc phân trang. Hãy thử đồng bộ lại.')
        seen.add(item['key'])
        f = item['fields']
        if f['issuetype']['name'] not in ('Task', 'Bug', 'Technical Story'):
            excluded[f['issuetype']['name']] = excluded.get(f['issuetype']['name'], 0) + 1
            continue
        assignee = f.get('assignee') or {}
        if assignee.get('displayName') not in DISPLAY_NAMES:
            excluded['Ngoài 5 thành viên'] = excluded.get('Ngoài 5 thành viên', 0) + 1
            continue
        tt = f.get('timetracking') or {}
        tasks.append({
            'key': item['key'], 'summary': f['summary'], 'description': f.get('description') or '',
            'url': base + '/browse/' + item['key'], 'type': f['issuetype']['name'],
            'assignee': assignee.get('displayName'), 'account': assignee.get('key') or assignee.get('name'),
            'status': f['status']['name'], 'statusCategory': f['status'].get('statusCategory', {}).get('key'),
            'priority': (f.get('priority') or {}).get('name'), 'labels': f.get('labels', []),
            'originalHours': tt.get('originalEstimateSeconds') / 3600 if tt.get('originalEstimateSeconds') is not None else None,
            'remainingHours': tt.get('remainingEstimateSeconds') / 3600 if tt.get('remainingEstimateSeconds') is not None else None,
            'spentHours': tt.get('timeSpentSeconds') / 3600 if tt.get('timeSpentSeconds') is not None else None,
            'storyPoints': f.get('customfield_10111'), 'taskPoints': f.get('customfield_10700'),
            'updated': f.get('updated'), 'parent': (f.get('parent') or {}).get('key'),
            'startedAt': first_start(item.get('changelog') or {}),
            'statusHistory': status_history(item.get('changelog') or {}),
            'links': [{'type': link.get('type', {}).get('name'), 'key': (link.get('outwardIssue') or link.get('inwardIssue') or {}).get('key')} for link in f.get('issuelinks', [])]
        })
    integration_error = None
    waiting = [t for t in tasks if t['status'] == INTEGRATION]
    if waiting:
        try:
            evidence = integration_evidence(waiting)
            for t in waiting:
                t['integration'] = evidence[t['key']]
        except Exception:
            # Optional data: a failed lookup must not drop the whole sync.
            integration_error = 'Không tải được task FE/Mob liên quan.'
    worklogs, worklog_errors = [], []
    start_day = (sprint.get('startDate') or '')[:10]
    end_day = (sprint.get('endDate') or '')[:10]
    if start_day and end_day:
        def fetch_logs(task):
            try:
                return issue_worklogs(task['key'], start_day, end_day), None
            except Exception:
                return [], task['key']
        with ThreadPoolExecutor(max_workers=5) as pool:
            for records, failed in pool.map(fetch_logs, tasks):
                worklogs.extend(records)
                if failed:
                    worklog_errors.append(failed)
    snapshot = {'syncedAt': datetime.now(LOCAL_TZ).isoformat(), 'source': 'Jira trực tiếp',
                'project': 'FSLP', 'jql': jql, 'sprint': {k: sprint.get(k) for k in ['id', 'name', 'state', 'startDate', 'endDate']},
                'totalLabeledIssues': len(raw), 'excluded': excluded, 'tasks': tasks,
                'worklogs': worklogs, 'worklogErrors': worklog_errors,
                'worklogWindowAvailable': bool(start_day and end_day), 'integrationError': integration_error}
    save_json(DATA / 'snapshot.json', snapshot)
    return snapshot


def validate_settings(value):
    if not isinstance(value, dict) or set(value) - {'sprints', 'assessments'}:
        raise ValueError('Cấu hình không hợp lệ.')
    if not isinstance(value.get('sprints', {}), dict) or not isinstance(value.get('assessments', {}), dict):
        raise ValueError('Cấu hình không hợp lệ.')
    for sprint_id, scope in value.get('sprints', {}).items():
        if not sprint_id.isdigit() or not isinstance(scope, dict) or set(scope) - {'capacity', 'assignments'}:
            raise ValueError('Cấu hình sprint không hợp lệ.')
        for name, settings in scope.get('capacity', {}).items():
            if name not in DISPLAY_NAMES or not isinstance(settings, dict):
                raise ValueError('Thành viên không hợp lệ.')
            for field in settings:
                if field not in ('hours', 'focus'):
                    raise ValueError('Trường capacity không hợp lệ.')
            for field, maximum in [('hours', 500), ('focus', 100)]:
                n = settings.get(field)
                if n is not None and (not isinstance(n, (int, float)) or not 0 <= n <= maximum):
                    raise ValueError('Capacity nằm ngoài giới hạn.')
        for key, name in scope.get('assignments', {}).items():
            if not key.startswith('FSLP-') or name not in DISPLAY_NAMES:
                raise ValueError('Phân công thử không hợp lệ.')
    for key, review in value.get('assessments', {}).items():
        if not key.startswith('FSLP-') or not isinstance(review, dict):
            raise ValueError('Task đánh giá không hợp lệ.')
        axes = review.get('axes', {})
        if set(axes) != {'business', 'data', 'integration', 'core', 'risk'}:
            raise ValueError('Cần đánh giá đủ 5 chiều.')
        if any(not isinstance(n, int) or not 0 <= n <= 4 for n in axes.values()):
            raise ValueError('Điểm phải từ 0 đến 4.')
        if not isinstance(review.get('note'), str) or not review['note'].strip() or len(review['note']) > 3000:
            raise ValueError('Cần ghi căn cứ đánh giá, tối đa 3000 ký tự.')
        if not isinstance(review.get('signature'), str) or len(review['signature']) > 100:
            raise ValueError('Thiếu phiên bản nội dung của task.')
    return value


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Never log bodies, authorization headers, or upstream errors.
        pass

    def respond(self, code, value, content_type='application/json; charset=utf-8'):
        body = json.dumps(value, ensure_ascii=False).encode() if isinstance(value, (dict, list)) else value
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def local_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}

    def do_GET(self):
        if not self.local_host():
            return self.respond(403, {'error': 'Chỉ truy cập từ localhost.'})
        route = urlparse(self.path).path
        if route == '/api/state':
            return self.respond(200, {'snapshot': read_json(DATA / 'snapshot.json'),
                                      'sprints': read_json(DATA / 'sprints.json', []),
                                      'settings': read_json(DATA / 'settings.json', {}), 'token': SESSION_TOKEN,
                                      'today': datetime.now(LOCAL_TZ).date().isoformat()})
        files = {'/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
                 '/engine.mjs': ('engine.mjs', 'text/javascript; charset=utf-8'), '/style.css': ('style.css', 'text/css; charset=utf-8')}
        if route in files:
            name, mime = files[route]
            return self.respond(200, (PUBLIC / name).read_bytes(), mime)
        # Fonts and icons: one directory level, fixed extensions, no path traversal.
        assets = {'.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8', '.png': 'image/png'}
        parts = route.strip('/').split('/')
        if len(parts) == 2 and parts[0] in ('fonts', 'icons') and Path(parts[1]).suffix in assets \
                and parts[1].replace('-', '').replace('.', '').isalnum() and (PUBLIC / parts[0] / parts[1]).is_file():
            return self.respond(200, (PUBLIC / parts[0] / parts[1]).read_bytes(), assets[Path(parts[1]).suffix])
        return self.respond(404, {'error': 'Không tìm thấy.'})

    def do_POST(self):
        if not self.local_host() or self.headers.get('X-Dashboard-Token') != SESSION_TOKEN:
            return self.respond(403, {'error': 'Phiên không hợp lệ. Tải lại trang.'})
        route = urlparse(self.path).path
        try:
            if route == '/api/refresh':
                if not LOCK.acquire(blocking=False):
                    return self.respond(409, {'error': 'Đang đồng bộ Jira, vui lòng chờ.'})
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                    if length > 1024:
                        raise ValueError('Yêu cầu không hợp lệ.')
                    body = json.loads(self.rfile.read(length)) if length else {}
                    sprint_id = int(body.get('sprintId', 251))
                    return self.respond(200, {'snapshot': refresh(sprint_id), 'sprints': read_json(DATA / 'sprints.json', []),
                                              'today': datetime.now(LOCAL_TZ).date().isoformat()})
                finally:
                    LOCK.release()
            if route == '/api/integration-done':
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4096:
                    return self.respond(400, {'error': 'Yêu cầu không hợp lệ.'})
                keys = json.loads(self.rfile.read(length)).get('keys')
                if not isinstance(keys, list) or not 0 < len(keys) <= 50 or len(set(keys)) != len(keys) \
                        or not all(isinstance(k, str) and re.fullmatch(r'FSLP-\d{1,6}', k) for k in keys):
                    return self.respond(400, {'error': 'Danh sách task không hợp lệ.'})
                if not LOCK.acquire(blocking=False):
                    return self.respond(409, {'error': 'Đang đồng bộ Jira, vui lòng chờ.'})
                try:
                    return self.respond(200, {'results': close_integration(keys)})
                finally:
                    LOCK.release()
            if route == '/api/settings':
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 250000:
                    return self.respond(400, {'error': 'Dữ liệu cấu hình quá lớn hoặc rỗng.'})
                value = validate_settings(json.loads(self.rfile.read(length)))
                with LOCK:
                    save_json(DATA / 'settings.json', value)
                return self.respond(200, {'saved': True})
            self.respond(404, {'error': 'Không tìm thấy.'})
        except HTTPError as error:
            self.respond(502, {'error': f'Jira trả HTTP {error.code}. Kiểm tra quyền truy cập / cấu hình fsel-jira. Snapshot trước được giữ nguyên.'})
        except (URLError, TimeoutError):
            self.respond(502, {'error': 'Không kết nối được Jira. Kiểm tra mạng/VPN rồi đồng bộ lại. Snapshot trước được giữ nguyên.'})
        except (ValueError, FileNotFoundError) as error:
            # All exposed errors are locally generated; never expose config or upstream bodies.
            message = str(error) if type(error) is ValueError else 'Chưa đọc được cấu hình fsel-jira trên máy.'
            self.respond(400, {'error': message})
        except Exception:
            self.respond(500, {'error': 'Không xử lý được dữ liệu. Snapshot trước được giữ nguyên; kiểm tra cấu hình và thử lại.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Backend Team Dashboard: http://127.0.0.1:{args.port}', flush=True)
    server.serve_forever()
