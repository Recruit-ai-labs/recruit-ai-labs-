import {notFound} from 'next/navigation';
import JoinForm from './JoinForm';
export default async function JoinPage({params}) {const{token}=await params;if(!/^[a-f0-9]{32}$/.test(token))notFound();return <div className="productPage"><section className="surfaceCard settingsCard"><h1>Join your team</h1><JoinForm token={token}/></section></div>;}
