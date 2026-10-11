"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {useApp} from "./Providers";
export default function useAdminOnlineUsers(){
 const {user,authLoading}=useApp();
 const [state,setState]=useState<{userId:string;users:{id:string;username:string;full_name:string}[];error:string}|null>(null);
 useEffect(()=>{
  if(!user||authLoading||!supabase)return;
  const client=supabase;let active=true,pending=false;let timer:ReturnType<typeof setInterval>|undefined;
  async function refresh(){
   if(pending)return;pending=true;
   try{
    const {data,error}=await client.rpc('admin_online_users');
    if(active)setState({userId:user!.id,users:error?[]:data,error:error?'Online status unavailable. Check migration 016 and connectivity.':''});
   }catch{if(active)setState({userId:user!.id,users:[],error:'Online status temporarily unavailable.'});}finally{pending=false;}
  }
  Promise.resolve(client.rpc('is_site_admin')).then(({data,error})=>{if(active&&!error&&data===true){void refresh();timer=setInterval(refresh,15000);}}).catch(()=>{});
  return()=>{active=false;if(timer)clearInterval(timer);};
 },[user,authLoading]);
 if(authLoading||!user||state?.userId!==user.id)return null;
 return state.error ? null : state.users.map(p=>p.id);
}
