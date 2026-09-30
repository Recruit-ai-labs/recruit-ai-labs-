'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Icon from './Icon';

const prompts = [
  ['Give me a quick overview of my workspace','layers'],
  ['Help me find the right candidates','users'],
  ['Show my application follow-ups','clock'],
  ['What can I do in Recruit AI?','spark'],
];
const suggestionContainer = { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.08 } } };
const suggestionItem = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};
const chatStorageKey = 'recruit-ai-previous-chats';
const makeChatId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function WorkspaceAssistant({name='there'}) {
  const [question,setQuestion]=useState(''),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [style,setStyle]=useState('Concise');
  const [savedChats,setSavedChats]=useState([]),[historyOpen,setHistoryOpen]=useState(false);
  const activeChatId=useRef(makeChatId());
  const controller=useRef(null),input=useRef(null),end=useRef(null);
  const reduceMotion=useReducedMotion();
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem(chatStorageKey)||'[]');if(Array.isArray(stored))setSavedChats(stored);}catch{setSavedChats([]);}},[]);
  useEffect(()=>{if(messages.length) end.current?.scrollIntoView({block:'end',behavior:reduceMotion?'auto':'smooth'});},[messages,busy,reduceMotion]);
  function persistChat(chatMessages) {
    if(!chatMessages.length) return;
    const firstUser=chatMessages.find(message=>message.role==='user');
    const chat={id:activeChatId.current,title:(firstUser?.content||'Recruit AI conversation').trim().slice(0,58),messages:chatMessages,updatedAt:Date.now()};
    setSavedChats(current=>{const next=[chat,...current.filter(item=>item.id!==chat.id)].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,12);localStorage.setItem(chatStorageKey,JSON.stringify(next));return next;});
  }
  function startNewChat() {
    controller.current?.abort();
    persistChat(messages);
    activeChatId.current=makeChatId();setMessages([]);setError('');setQuestion('');setHistoryOpen(false);input.current?.focus();
  }
  function restoreChat(chat) {
    controller.current?.abort();activeChatId.current=chat.id;setMessages(chat.messages||[]);setError('');setQuestion('');setHistoryOpen(false);input.current?.focus();
  }
  function deleteChat(chatId,event) {
    event.stopPropagation();
    if(!window.confirm('Delete this previous chat? This cannot be undone.')) return;
    setSavedChats(current=>{
      const next=current.filter(chat=>chat.id!==chatId);
      localStorage.setItem(chatStorageKey,JSON.stringify(next));
      return next;
    });
    if(activeChatId.current===chatId){
      controller.current?.abort();
      activeChatId.current=makeChatId();
      setMessages([]);setQuestion('');setError('');setBusy(false);
    }
  }
  async function send(text=question) {
    if(!text.trim()||busy) return;
    const history=[...messages,{role:'user',content:text.trim()}];
    setMessages(history);setQuestion('');setBusy(true);setError('');
    controller.current=new AbortController();
    const timer=setTimeout(()=>controller.current?.abort(),55000);
    try {
      const response=await fetch('/api/workspace-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-10),style}),signal:controller.current.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Could not get an answer. Try again.');}
      if(!response.body) throw new Error('The assistant returned an empty response.');
      const reader=response.body.getReader(),decoder=new TextDecoder();let answer='';
      setMessages([...history,{role:'assistant',content:''}]);
      while(true){const {done,value}=await reader.read();if(done)break;answer+=decoder.decode(value,{stream:true});setMessages([...history,{role:'assistant',content:answer}]);}
      answer+=decoder.decode();
      if(!answer.trim())throw new Error('The assistant returned an empty response. Please retry.');
      persistChat([...history,{role:'assistant',content:answer}]);
    } catch(e) {setMessages(history);setError(e.name==='AbortError'?'The reply took too long. Please retry.':e.message);setQuestion(text);}
    finally {clearTimeout(timer);setBusy(false);}
  }
  const historyContent=savedChats.length>0?savedChats.map(chat=><div className="chatHistoryItem" key={chat.id}><button className="chatHistoryOpen" type="button" onClick={()=>restoreChat(chat)}><span>{chat.title}</span><small>{new Date(chat.updatedAt).toLocaleDateString()}</small></button><button className="chatHistoryDelete" type="button" onClick={event=>deleteChat(chat.id,event)} aria-label={`Delete ${chat.title}`} title="Delete chat">&#128465;</button></div>):<p className="chatHistoryEmpty">Your previous chats will appear here.</p>;
  return <div className="chatWorkspace">
    <div className="chatToolbar"><span className="chatIdentity"><Icon name="spark" size={15}/>Recruit AI <span>Assistant</span></span><div className="chatToolbarActions"><motion.button className="chatHistoryToggle" whileHover={reduceMotion?undefined:{y:-2,scale:1.015}} whileTap={reduceMotion?undefined:{scale:.97}} transition={{type:'spring',stiffness:420,damping:24}} onClick={()=>setHistoryOpen(value=>!value)} aria-expanded={historyOpen}>Previous chats</motion.button><motion.button whileHover={reduceMotion?undefined:{y:-2,scale:1.015}} whileTap={reduceMotion?undefined:{scale:.97}} transition={{type:'spring',stiffness:420,damping:24}} onClick={startNewChat} disabled={busy}>+ New chat</motion.button></div></div>
    <AnimatePresence>{historyOpen&&<motion.aside className="chatHistoryPanel" initial={reduceMotion?false:{opacity:0,y:-8,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:.98}} transition={{duration:.2}}><div className="chatHistoryHeader"><strong>Previous chats</strong><button className="chatHistoryClose" type="button" onClick={()=>setHistoryOpen(false)} aria-label="Close previous chats">&#215;</button></div>{historyContent}</motion.aside>}</AnimatePresence>
    <section className={`chatStage ${messages.length?'hasConversation':''}`} aria-busy={busy}>
      <AnimatePresence mode="wait">
      {!messages.length?<motion.header key="welcome" className="chatWelcome" initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.34,ease:[.16,1,.3,1]}}><motion.div className="chatOrb" aria-hidden="true" whileHover={reduceMotion?undefined:{scale:1.04,rotate:3}}/><h1>Good to see you, {name}<br/>What’s on <em>your mind?</em></h1></motion.header>:
      <motion.div key="transcript" className="chatTranscript" role="log" aria-label="Conversation" initial={reduceMotion?false:{opacity:0}} animate={{opacity:1}}>{messages.map((m,i)=>{const streaming=busy&&m.role==='assistant'&&i===messages.length-1;return <motion.article layout key={`${m.role}-${i}`} className={`${m.role}${streaming?' isStreaming':''}`} initial={reduceMotion?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.24}}><small>{m.role==='user'?'You':streaming?'Recruit AI is writing…':'Recruit AI'}</small><p>{m.content}{streaming&&<span className="chatCursor" aria-hidden="true"/>}{streaming&&<span className="chatSrOnly" role="status">Recruit AI is writing a response</span>}</p></motion.article>})}{busy&&messages.at(-1)?.role!=='assistant'&&<p className="chatThinking" role="status"><i/><i/><i/><span>Recruit AI is preparing a response</span></p>}<div ref={end}/></motion.div>}
      </AnimatePresence>
      {!messages.length&&<motion.div className="chatSuggestions" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.12,duration:.4,ease:[.16,1,.3,1]}}><p>A little inspiration to get started</p><motion.div variants={suggestionContainer} initial={reduceMotion?false:'hidden'} animate="show">{prompts.map(([text,icon])=><motion.button variants={suggestionItem} key={text} onClick={()=>send(text)} whileHover={reduceMotion?undefined:{y:-5,scale:1.018}} whileTap={reduceMotion?undefined:{scale:.975}} transition={{type:'spring',stiffness:360,damping:24}}><span>{text}</span><Icon name={icon} size={18}/></motion.button>)}</motion.div></motion.div>}
      <motion.form className="chatComposer" onSubmit={e=>{e.preventDefault();send();}} initial={reduceMotion?false:{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.08,duration:.5,ease:[.16,1,.3,1]}}>
        <div className="chatInputRow"><Icon name="spark" size={17}/><textarea ref={input} aria-label="Ask Recruit AI" placeholder="Ask a question about your workspace…" value={question} maxLength={4000} rows={3} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/></div>
        <div className="chatComposerFoot"><label><span className="chatSrOnly">Response style</span><select value={style} onChange={e=>setStyle(e.target.value)}><option>Concise</option><option>Detailed</option></select></label><span className="chatContext"><i/>Workspace context</span><motion.button className="chatSend" type="submit" disabled={busy||!question.trim()} aria-label="Send message" whileHover={reduceMotion?undefined:{y:-3,rotate:-4,scale:1.06}} whileTap={reduceMotion?undefined:{scale:.9,rotate:0}} transition={{type:'spring',stiffness:500,damping:22}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></motion.button></div>
      </motion.form>
      <AnimatePresence>{error&&<motion.div className="chatError" role="alert" initial={reduceMotion?false:{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><span>{error}</span><button type="button" onClick={()=>send(question)}>Retry</button></motion.div>}</AnimatePresence>
      <p className="chatFootnote">Your workspace, a little clearer. Review important details before acting.</p>
    </section>
  </div>;
}
