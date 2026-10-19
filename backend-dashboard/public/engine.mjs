export const MEMBERS = [
  {name:'Hà Quang Hải', short:'Hải', initials:'HH', role:'Team lead', color:'#2a78d6', level:4, focus:50,
    domains:['AI','Tích hợp','Báo cáo','Nghiệp vụ'], growth:['Kiến trúc','Mentoring'],
    strengths:'Điều phối delivery, quyết định kỹ thuật và hỗ trợ tháo gỡ vướng mắc.',
    aim:'Tăng năng lực của cả team, giảm phụ thuộc vào lead.',
    plan:[['2 tuần','Review thiết kế các task rủi ro cao; chia nhỏ task lớn và giao ownership rõ cho member.','Có checklist review và ít nhất 2 task được member tự dẫn dắt.'],['4 tuần','Giao Khoa phụ trách một luồng end-to-end; để Phương chủ trì quyết định core.','Ghi lại quyết định kỹ thuật và kết quả bàn giao, không phải lead làm thay.'],['8 tuần','Chuẩn hóa nhịp review, theo dõi rework và thời gian chờ integration.','So sánh số task cần lead can thiệp và thời gian chờ giữa các sprint.']]},
  {name:'Nguyễn Trọng Phương - FSEL', short:'Phương', initials:'TP', role:'Senior · Core', color:'#eb6834', level:4, focus:80,
    domains:['Core','Dữ liệu','Hiệu năng','Tích hợp','Bảo mật'], growth:['Mentoring','Kiến trúc'],
    strengths:'Theo định hướng của bạn: xử lý chuyên sâu và xây dựng core.',
    aim:'Sở hữu nền tảng, truyền lại cách tư duy và vận hành an toàn.',
    plan:[['2 tuần','Chủ trì task core / migration; viết phương án, failure modes và rollback trước khi code.','Một thiết kế có trade-off, cách kiểm chứng và reviewer.'],['4 tuần','Pair với Khoa trong một task tích hợp; hướng dẫn Duy truy vết dữ liệu.','Member giải thích lại luồng và tự hoàn tất phần việc được giao.'],['8 tuần','Đóng gói hướng dẫn dùng core và chuyển giao một phần ownership.','Core có ví dụ sử dụng, tiêu chí hiệu năng và người thứ hai vận hành được.']]},
  {name:'Phan Minh Phúc', short:'Phúc', initials:'MP', role:'Junior', color:'#1baf7a', level:2, focus:80,
    domains:['Course','Báo cáo','Câu hỏi'], growth:['Dữ liệu','Nghiệp vụ'],
    strengths:'Phạm vi hiện tại: course, báo cáo và các dạng câu hỏi.',
    aim:'Tự chủ một luồng nghiệp vụ quen thuộc từ yêu cầu đến kiểm thử.',
    plan:[['2 tuần','Chọn task course / câu hỏi có scope rõ; viết bảng input, output và edge case trước khi làm.','Nêu đủ rule chính và kiểm chứng các tình huống biên.'],['4 tuần','Nhận một task báo cáo có truy vấn nhiều bảng, pair với Phương ở phần dữ liệu.','Giải thích được join, phân trang và bằng chứng kiểm tra kết quả.'],['8 tuần','Sở hữu một tính năng nhỏ end-to-end trong domain quen thuộc.','Tự estimate theo breakdown, báo rủi ro sớm và tự trình bày demo.']]},
  {name:'Nguyen Huu Khoa', short:'Khoa', initials:'HK', role:'Junior → Middle', color:'#eda100', level:2.5, focus:80,
    domains:['Nghiệp vụ','Tích hợp','Câu hỏi','AI'], growth:['Core','Dữ liệu'],
    strengths:'Đang được thử thách lên Middle; phạm vi chuyên môn cụ thể cần hiệu chỉnh qua review task.',
    aim:'Chứng minh ownership và khả năng thiết kế, không chỉ hoàn thành phần code.',
    plan:[['2 tuần','Nhận một task mức vừa / khó có mentor; đề xuất breakdown, API contract và estimate.','Tự nêu dependency, rủi ro và kế hoạch kiểm thử trước implementation.'],['4 tuần','Chủ trì một luồng end-to-end, review phần việc nhỏ của Duy.','Tự xử lý phản hồi review và giải thích trade-off với lead.'],['8 tuần','Đánh giá thử thách Middle qua nhiều task đã hoàn tất và bằng chứng review.','Xem tính tự chủ, chất lượng, phối hợp và độ lệch estimate; không xét chỉ theo số task.']]},
  {name:'Hữu Duy - FSEL', short:'Duy', initials:'HD', role:'Fresher', color:'#e87ba4', level:1, focus:70,
    domains:['Báo cáo','Nghiệp vụ'], growth:['Dữ liệu','Course'],
    strengths:'Theo nhận xét của bạn: chịu khó tìm tòi và muốn hiểu sâu. Domain đề xuất cần được xác nhận.',
    aim:'Biến sự tìm tòi thành cách làm có cấu trúc, có điểm dừng và bằng chứng.',
    plan:[['2 tuần','Task nhỏ, một luồng rõ; viết lại data flow và nhờ mentor kiểm tra trước khi code.','Giải thích được từ request tới database; có checklist tự kiểm tra.'],['4 tuần','Làm một task báo cáo / validation có 1–2 tình huống biên mới.','Tự tái hiện lỗi, kiểm tra dữ liệu và báo vướng mắc sớm.'],['8 tuần','Tự chủ task thường gặp, mở rộng dần sang domain course hoặc dữ liệu.','Có nhiều task liên tiếp đáp ứng checklist; tăng scope sau review, không chỉ tăng số lượng.']]}
];

export const AXES = [
  {id:'business',name:'Nghiệp vụ',weight:20,description:'Số rule, nhánh xử lý và mức mơ hồ của yêu cầu.'},
  {id:'data',name:'Dữ liệu',weight:25,description:'Truy vấn, mô hình dữ liệu, migration và tính nhất quán.'},
  {id:'integration',name:'Tích hợp',weight:20,description:'Hợp đồng API, dịch vụ ngoài, luồng bất đồng bộ.'},
  {id:'core',name:'Core & kỹ thuật',weight:20,description:'Thiết kế nền tảng, concurrency, hiệu năng, khả năng tái sử dụng.'},
  {id:'risk',name:'Rủi ro',weight:15,description:'Ảnh hưởng production, bảo mật, dữ liệu và khả năng rollback.'}
];
export const LEVELS = ['Không đáng kể','Cơ bản','Vừa','Phức tạp','Rất cao'];
const RULES = [
 ['business',2,'Nhiều quy tắc nghiệp vụ',/cham diem|scoring|tinh diem|tien do|muc tieu|chung chi|aptis|marketplace/],
 ['business',3,'Luồng nghiệp vụ nhiều bước',/quy trinh|workflow|thanh toan|payment|coin|giua ky|cuoi ky|phan quyen/],
 ['business',2,'Dữ liệu tổng hợp / báo cáo',/bao cao|report|dashboard|thong ke/],
 ['data',2,'Xử lý / truy vấn dữ liệu',/bao cao|report|dashboard|truy van|query|import|export|du lieu|database|sql/],
 ['data',3,'Tổng hợp hoặc chuyển dữ liệu',/tong hop|aggregation|chuyen data|chuyen du lieu|dong bo|synchroniz|nhieu bang|transaction/],
 ['data',4,'Migration / đổi hệ quản trị',/migration|migrate|postgres|sql server sang|chuyen doi co so du lieu/],
 ['integration',2,'API hoặc luồng liên hệ thống',/\bapi\b|open ?id|webhook|tich hop|integration|lms.admin.*lms|\bai\b/],
 ['integration',3,'Dịch vụ ngoài / xử lý bất đồng bộ',/openai|zalo|payment|thanh toan|queue|rabbitmq|kafka|event bus|signalr/],
 ['core',2,'Thay đổi logic kỹ thuật',/logic|cau hinh|config|cham diem|unittest|unit test/],
 ['core',3,'Thiết kế thành phần dùng chung',/\bcore\b|thu vien|library|framework|cache|hieu nang|performance|microservice/],
 ['core',4,'Kiến trúc / hệ thống đồng thời',/kien truc|architecture|concurrency|distributed|race condition|deadlock|postgres/],
 ['risk',2,'Ảnh hưởng kết quả / tài khoản',/diem|score|mat khau|password|xac thuc|authentication|import|production|\bprod\b/],
 ['risk',3,'Bảo mật, thanh toán, quyền truy cập',/bao mat|security|phan quyen|authorization|thanh toan|payment|du lieu ca nhan/],
 ['risk',4,'Thay đổi dữ liệu khó đảo ngược',/xoa du lieu|mat du lieu|data loss|migration|postgres/]
];
const DOMAINS = [
 ['Core',/\bcore\b|thu vien|library|framework|kien truc|architecture|unittest|postgres/],
 ['Dữ liệu',/du lieu|database|sql|import|export|migration|truy van/],
 ['Hiệu năng',/hieu nang|performance|cache|toi uu/],
 ['Tích hợp',/\bapi\b|integration|tich hop|webhook|signalr|zalo|open ?id/],
 ['Bảo mật',/mat khau|password|phan quyen|bao mat|xac thuc/],
 ['AI',/\bai\b|openai|chatbot|prompt/],
 ['Báo cáo',/bao cao|report|dashboard|thong ke/],
 ['Câu hỏi',/cau hoi|question|aptis|speaking|writing|listening|reading|cham diem|drag and drop|exercise/],
 ['Course',/course|khoa hoc|tien do|hoc tap|bai hoc|lesson/]
];
export function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();}
export function stage(t){
 if(['Canceled','Cancelled'].includes(t.status))return 'canceled';
 if(t.statusCategory==='done'||['Done','Testing Done','UAT Done','Closed'].includes(t.status))return 'done';
 if(['Ready for Integration','Ready for Review','Ready for Testing','In Testing','Ready for UAT','In UAT'].includes(t.status))return 'waiting';
 if(['In Progress','In Development'].includes(t.status))return 'doing';
 if(t.status==='Pending')return 'blocked';
 return 'todo';
}
// Ready for Review / Ready for Integration count as completed, awaiting acceptance.
export const ACCEPTANCE = ['Ready for Review','Ready for Integration'];
export const isOpen = t => !['done','canceled'].includes(stage(t)) && !ACCEPTANCE.includes(t.status);
export function signature(t){
 const s=JSON.stringify([t.summary,t.description,t.priority,t.labels]);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16);
}
export function analyze(task, reviews={}){
 const raw=task.summary+'\n'+task.description, text=normalize(raw);
 const axes=Object.fromEntries(AXES.map(a=>[a.id,1]));
 const evidence=[];
 for(const [axis,score,label,regex] of RULES){const match=text.match(regex);if(match){axes[axis]=Math.max(axes[axis],score);evidence.push({axis,label,score,match:match[0]});}}
 const domains=DOMAINS.filter(([,r])=>r.test(text)).map(([name])=>name);if(!domains.length)domains.push('Nghiệp vụ');
 const review=reviews[task.key];const reviewed=!!review&&review.signature===signature(task);
 if(reviewed)for(const a of AXES)axes[a.id]=review.axes[a.id];
 let score=Math.round(AXES.reduce((s,a)=>s+axes[a.id]/4*a.weight,0));
 const gate=axes.core>=4||axes.risk>=4||axes.data>=4;
 if(gate)score=Math.max(score,65);
 const difficulty=score<=25?'Cơ bản':score<=45?'Vừa':score<=65?'Khó':score<=80?'Chuyên sâu':'Rất chuyên sâu';
 const descriptionLength=String(task.description||'').trim().length;
 const confidence=reviewed?'Đã hiệu chỉnh':descriptionLength<80?'Thấp':evidence.length>=4?'Vừa':'Thấp';
 return {axes,score,difficulty,evidence,domains,gate,reviewed,stale:!!review&&!reviewed,confidence,
   note:reviewed?review.note:null,missingDescription:descriptionLength<80};
}
export function workingDays(today,end){
 let count=0;const d=new Date(today.slice(0,10)+'T00:00:00Z');const last=new Date(end.slice(0,10)+'T00:00:00Z');
 for(;d<=last;d.setUTCDate(d.getUTCDate()+1))if(d.getUTCDay()!==0&&d.getUTCDay()!==6)count++;
 return count;
}
// hoursLeft: working hours still left in the sprint; when given, capacity = hoursLeft × focus instead of whole days × 8h.
export function workload(tasks, settings={}, today, end, start=today, hoursLeft=null){
 const days=end?workingDays(start.slice(0,10)>today?start.slice(0,10):today,end):0;
 return MEMBERS.map(m=>{
  const mine=tasks.filter(t=>(settings.assignments?.[t.key]||t.assignee)===m.name);
  const active=mine.filter(isOpen);const capacity=settings.capacity?.[m.name]||{};
  const focus=capacity.focus??m.focus;const available=capacity.hours??(hoursLeft!=null?Math.round(hoursLeft*focus/50)/2:Math.round(days*8*focus/100));
  const remaining=active.reduce((s,t)=>s+(t.remainingHours??0),0);
  const missing=active.filter(t=>t.remainingHours==null).length;
  const staleZero=active.filter(t=>t.remainingHours===0&&['doing','todo','blocked'].includes(stage(t))).length;
  return {...m,tasks:mine,active,count:mine.length,remaining,missing,staleZero,available,focus,days,hoursLeft,manual:capacity.hours!=null,
   original:mine.reduce((s,t)=>s+(t.originalHours??0),0),originalCount:mine.filter(t=>t.originalHours!=null).length,
   spent:mine.reduce((s,t)=>s+(t.spentHours??0),0),counts:mine.reduce((a,t)=>(a[stage(t)]++,a),{done:0,waiting:0,doing:0,todo:0,blocked:0,canceled:0})};
 });
}
export function recommend(task, analysis, loads, settings={}){
 const current=settings.assignments?.[task.key]||task.assignee;
 if(!isOpen(task))return {candidates:[],owner:current,mentor:null,reason:ACCEPTANCE.includes(task.status)?'Task đã hoàn thành, đang chờ nghiệm thu; giữ owner.':'Task đã hoàn tất / hủy; không đưa vào đề xuất phân công.',locked:true};
 const started=['doing','waiting','blocked'].includes(stage(task));
 const complexity=analysis.score;
 const target=analysis.gate?4:complexity<=25?1:complexity<=45?2:complexity<=65?3:4;
 const candidates=loads.map(m=>{
  const overlaps=analysis.domains.filter(d=>m.domains.includes(d));
  const growth=analysis.domains.some(d=>m.growth.includes(d));
  const stretch=target>m.level&&target-m.level<=1;
  const eligible=(!analysis.gate||m.level>=4)&&target-m.level<=1&&m.available>0;
  // Remove the task itself from current owner load before comparing candidates.
  const prior=m.active.filter(t=>t.key!==task.key);
  const hours=prior.reduce((s,t)=>s+(t.remainingHours??0),0);
  const unknown=prior.filter(t=>t.remainingHours==null).length;
  const loadRatio=m.available>0?(hours+(task.remainingHours??0))/m.available:Infinity;
  const loadPenalty=Math.min(30,loadRatio*12)+Math.min(12,unknown*2);
  const fit=Math.max(0,35-Math.abs(target-m.level)*9);
  const score=Math.round(40+fit+Math.min(15,overlaps.length*8)+(stretch?8:0)+(growth?4:0)-loadPenalty-(m.role==='Team lead'?8:0));
  return {...m,score,eligible,stretch,overlaps,unknown,loadRatio,reason:[overlaps.length?'Đúng domain: '+overlaps.join(', '):'Cần làm rõ độ quen domain',stretch?'Task thử thách có mentor':'Mức khó phù hợp nền tảng',unknown?`${unknown} việc khác thiếu remaining estimate`:'Đã xét remaining estimate',m.available===0?'Không còn capacity':`Capacity còn lại ${m.available}h`].join(' · ')};
 }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score);
 const chosen=started?loads.find(m=>m.name===current):candidates.find(m=>m.eligible);
 const owner=chosen?.name||current;
 let mentor=null;
 if(chosen&&chosen.level<4){mentor=analysis.gate||analysis.axes.core>=3||analysis.axes.data>=3?MEMBERS[1].name:MEMBERS[0].name;}
 const candidate=candidates.find(m=>m.name===owner);
 return {candidates,owner,mentor,locked:started,stretch:!!candidate?.stretch,
  reason:started?'Giữ owner vì task đã bắt đầu, đang chờ bước tiếp theo hoặc đang Pending.':chosen?'Gợi ý cân bằng độ khó, domain, capacity và cơ hội phát triển.':'Không có người đáp ứng cả capacity và ngưỡng kỹ thuật; lead cần quyết định.',
  provisional:!analysis.reviewed||task.remainingHours==null};
}
