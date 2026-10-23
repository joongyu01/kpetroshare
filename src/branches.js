export const branches = [
  {id:'hq',name:'본사',region:'경기 성남',city:'성남',coord:[127.06,37.40],label:[-165,16],area:['Gyeonggi'],summary:'건강 측정부터 사무·운동용품까지',icon:'building-2'},
  {id:'north',name:'수도권북부본부',region:'경기 의정부',city:'의정부',coord:[127.05,37.75],label:[-174,-22],area:['Seoul','Gyeonggi'],summary:'전동공구와 자동차·안전용품',icon:'drill'},
  {id:'gangwon',name:'강원본부',region:'강원 횡성',city:'횡성',coord:[128.07,37.46],label:[35,-24],area:['Gangwon'],summary:'청사에서 함께 쓰는 안전·사무용품',icon:'hard-hat'},
  {id:'chungbuk',name:'충북본부',region:'충북 음성',city:'음성',coord:[127.55,36.96],label:[36,-8],area:['North Chungcheong'],summary:'정원 관리와 작업에 필요한 공구',icon:'wrench'},
  {id:'sejong',name:'대전세종충남본부',region:'세종 조치원',city:'세종',coord:[127.29,36.60],label:[-193,6],area:['Sejong','Daejeon','South Chungcheong'],summary:'드릴·예초기 등 다양한 작업용품',icon:'drill'},
  {id:'jeonbuk',name:'전북본부',region:'전북 완주',city:'완주',coord:[127.12,35.96],label:[-158,8],area:['North Jeolla'],summary:'청소·정비·안전용품을 한곳에',icon:'wrench'},
  {id:'daegu',name:'대구경북본부',region:'경북 구미',city:'구미',coord:[128.42,36.10],label:[50,25],area:['Daegu','North Gyeongsang'],summary:'생활 공구와 응급·안전용품',icon:'briefcase-medical'},
  {id:'busan',name:'부산울산경남본부',region:'부산 강서',city:'부산',coord:[128.88,35.15],label:[27,15],area:['Busan','Ulsan','South Gyeongsang'],summary:'생활가전부터 측정·작업 장비까지',icon:'fan'},
  {id:'jeju',name:'제주본부',region:'제주 애월',city:'제주',coord:[126.40,33.46],label:[37,-4],area:['Jeju'],summary:'꼭 필요할 때 찾는 다섯 가지 공구',icon:'sprout'},
  {id:'research',name:'미래기술연구소',region:'충북 청주',city:'청주',coord:[127.41,36.72],label:[48,35],area:[],summary:'연구장비·회의실·주차장',icon:'building-2'},
  {id:'gwangju',name:'광주전남본부',region:'광주 북구',city:'광주',coord:[126.85,35.23],label:[-157,18],area:['Gwangju','South Jeolla'],empty:true,address:'광주광역시 북구 첨단과기로208번길 42',icon:'map-pin'},
  {id:'south',name:'수도권남부본부',region:'경기 성남',city:'성남',area:['Incheon'],empty:true,address:'경기도 성남시 분당구 안양판교로 1207',icon:'map-pin'}
];
export const categoryOf = name => {
 if(/안전|보안|시험복|락아웃|들것|구급|제세동|가스감지|풍속|가스통/.test(name))return '안전·측정';
 if(/탁구|혈액|인바디|런닝|혈압|산소/.test(name))return '건강·운동';
 if(/복합|세절|코팅|카메라|제습|에어컨/.test(name))return '생활·사무';
 if(/천막/.test(name))return '행사·야외';
 return '공구·정비';
};
export const icons={'공구·정비':'wrench','안전·측정':'hard-hat','건강·운동':'heart-pulse','생활·사무':'printer','행사·야외':'tent'};


