const http = require('http');

const ports = Array.from({length: 8}, (_,i)=>5173+i);

function fetchCss(port){
  return new Promise((resolve)=>(
    http.get({hostname:'127.0.0.1', port, path:'/src/index.css', timeout:2000}, (res)=>{
      let data='';
      res.on('data', (c)=> data+=c);
      res.on('end', ()=> resolve({port, status:res.statusCode, body: data}));
    }).on('error', (e)=> resolve({port, error: e.message}))
  ));
}

(async function(){
  for(const p of ports){
    const r = await fetchCss(p);
    if(r.error) {
      console.log(`port ${p}: error: ${r.error}`);
      continue;
    }
    console.log('---');
    console.log(`port ${p}: status ${r.status}`);
    if(r.body && r.body.length>0){
      const preview = r.body.slice(0,800).replace(/\n/g,'\\n');
      console.log('preview:', preview);
      const hasTailwindDirective = /@tailwind/.test(r.body);
      const hasUtility = /min-height:100vh|\.min-h-screen|--tw-bg-opacity/.test(r.body);
      console.log('contains @tailwind directive?', hasTailwindDirective);
      console.log('contains generated utility (min-h-screen or tailwind token)?', hasUtility);
      process.exit(0);
    }
  }
  console.error('No CSS fetched from ports 5173-5180');
  process.exit(2);
})();
