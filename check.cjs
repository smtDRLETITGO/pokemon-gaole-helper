const https = require('https'); 
https.get('https://wiki.52poke.com/wiki/File:%E5%AE%9D%E5%8F%AF%E6%A2%A6%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F_%E8%B6%85%E8%83%BD%E5%8A%9B%E5%B1%9E%E6%80%A7.svg', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => { 
  let data = ''; res.on('data', d => data+=d); 
  res.on('end', () => { 
    const match = data.match(/href=\"(https:\/\/media\.52poke\.com\/wiki\/[^\"]+\.svg)\"/); 
    if(match) { 
      https.get(match[1], { headers: { 'User-Agent': 'Mozilla/5.0' } }, res2 => { 
        let data2 = ''; res2.on('data', d => data2+=d); 
        res2.on('end', () => console.log(data2.substring(0, 500))); 
      }); 
    } 
  }); 
});
