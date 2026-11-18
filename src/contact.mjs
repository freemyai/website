import { CONTACT_EMAIL, siteUrl } from './site-config.mjs';

export function buildMailto({kind='general',locale='en',work}={}){
  if(!['general','partnership','submission','correction'].includes(kind)||!['zh','en'].includes(locale))throw new Error('Invalid contact request');
  const zh=locale==='zh';
  const subjects={general:zh?'网站建议':'Website feedback',partnership:zh?'合作咨询':'Partnership enquiry',submission:zh?'作品推荐':'Creation submission'};
  let subject=`[Freemy] ${subjects[kind]||''}`,body='';
  if(kind==='submission')body=zh?'作品名称：\n体验网址：\n创作者：\n作品简介：\nAI 如何参与：\n相关来源：':'Creation name:\nExperience URL:\nCreator:\nDescription:\nHow AI was involved:\nSources:';
  if(kind==='correction'){
    if(!work||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.id||'')||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.slug||''))throw new Error('Invalid correction work');
    const title=String(work.locales?.[locale]?.title||work.title_original||work.id).replace(/[\r\n\x00-\x1f]+/g,' ');
    const page=siteUrl(`${zh?'':'/en'}/works/${work.slug}/`);
    subject=`[Freemy] ${zh?'作品资料反馈':'Creation correction'}: ${work.id}`;
    body=zh?`作品：${title}\nFreemy 页面：${page}\n\n问题或补充资料：\n`:`Creation: ${title}\nFreemy page: ${page}\n\nCorrection or additional source:\n`;
  }
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body?`&body=${encodeURIComponent(body)}`:''}`;
}
