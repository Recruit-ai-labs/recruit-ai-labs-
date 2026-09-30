'use client';
import {useState} from 'react';
export default function CandidateTabs({profile,applications,activity,dna,count}) {
  const [tab,setTab]=useState('profile');
  const tabs=[['profile','Profile'],['dna','Tech DNA'],['applications',`Applications (${count})`],['activity','Activity']];
  return <><div className="crTabs" role="tablist" aria-label="Candidate sections">{tabs.map(([id,label],index)=><button key={id} id={`candidate-tab-${id}`} role="tab" aria-selected={id===tab} tabIndex={id===tab?0:-1} aria-controls={`candidate-panel-${id}`} onClick={()=>setTab(id)} onKeyDown={event=>{const offset=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:offset?(index+offset+tabs.length)%tabs.length:null;if(next!==null){event.preventDefault();setTab(tabs[next][0]);document.getElementById(`candidate-tab-${tabs[next][0]}`)?.focus();}}}>{label}</button>)}</div>{tabs.map(([id])=><section key={id} id={`candidate-panel-${id}`} role="tabpanel" aria-labelledby={`candidate-tab-${id}`} hidden={tab!==id} tabIndex={0}>{({profile,applications,activity,dna})[id]}</section>)}</>;
}
