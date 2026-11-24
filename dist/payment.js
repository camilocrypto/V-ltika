'use strict';
// Only Testnet is used. The randomly generated passenger key lives in memory.
window.TestPayment = (() => {
  const api='https://horizon-testnet.stellar.org', faucet='https://friendbot.stellar.org';
  const driver='GBX463TDJHHDQAS3PRK5LX4CJYPTWR6VLNYLPMACGFO4NVDGARWMKY6N';
  let sdkReady, passenger;
  async function sdk() {
    if(!sdkReady) sdkReady=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='assets/stellar-sdk.min.js';
      script.onload=()=>resolve(window.StellarSdk);
      script.onerror=()=>{sdkReady=null;reject(new Error('No se pudo abrir el SDK de Stellar.'));};
      document.head.appendChild(script);
    });
    return sdkReady;
  }
  async function request(url,opts={}) {
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),18000);
    try{return await fetch(url,{...opts,signal:ctl.signal,cache:'no-store'});}finally{clearTimeout(timer);}
  }
  async function lookup(hash){
    const res=await request(api+'/transactions/'+hash);
    if(res.status===404)return null;
    if(!res.ok)throw new Error('Horizon no pudo verificar el estado. Puedes volver a consultarlo.');
    const data=await res.json();return data.hash===hash && data.successful===true?'ok':'failed';
  }
  async function pay(trip,save,onStage){
    if(!trip.publicationConsent)throw new Error('Confirma primero la publicación en Testnet.');
    const S=await sdk();
    if(trip.chain?.paid)return;
    if(!trip.chain?.xdr){
      onStage('Preparando billetera de prueba…');if(!passenger)passenger=S.Keypair.random();
      let source=await request(api+'/accounts/'+passenger.publicKey());
      if(source.status===404){
        onStage('Solicitando XLM de prueba a Friendbot…');
        const funded=await request(faucet+'/?addr='+encodeURIComponent(passenger.publicKey()));
        if(!funded.ok)throw new Error('Friendbot no pudo entregar saldo de prueba. Tu comprobante demo sigue disponible.');
        source=await request(api+'/accounts/'+passenger.publicKey());
      }
      if(!source.ok)throw new Error('Stellar Testnet no pudo cargar la cuenta de prueba.');
      const account=await source.json(), to=await request(api+'/accounts/'+driver);
      if(!to.ok && to.status!==404) throw new Error('No se pudo consultar la cuenta de destino.');
      const builder=new S.TransactionBuilder(new S.Account(account.account_id,account.sequence),{fee:'100',networkPassphrase:S.Networks.TESTNET});
      if(to.status===404) builder.addOperation(S.Operation.createAccount({destination:driver,startingBalance:'2'}));
      const tx=builder.addOperation(S.Operation.payment({destination:driver,asset:S.Asset.native(),amount:trip.quote.xlm.toFixed(7)}))
        .addMemo(S.Memo.text(trip.publicRef)).setTimeout(180).build();
      tx.sign(passenger);
      trip.chain={hash:tx.hash().toString('hex'),xdr:tx.toXDR(),expires:Number(tx.timeBounds.maxTime)*1000,paid:false};save(trip);
    }
    const markPaid=()=>{trip.chain={hash:trip.chain.hash,paid:true};save(trip);};
    onStage('Verificando el registro en Stellar Testnet…');
    const state=await lookup(trip.chain.hash);
    if(state==='ok'){markPaid();return;}
    if(state==='failed'){delete trip.chain;save(trip);throw new Error('La red rechazó el intento. Puedes preparar otro.');}
    if(Date.now()>trip.chain.expires){
      const head=await request(api+'/ledgers?order=desc&limit=1');
      if(head.ok){
        const record=(await head.json())._embedded?.records?.[0];
        if(record && Date.parse(record.closed_at)>trip.chain.expires && (await lookup(trip.chain.hash))===null){
          delete trip.chain;save(trip);throw new Error('El intento venció sin confirmación. Puedes volver a probar.');
        }
      }
      throw new Error('Esperando que Horizon confirme el estado del intento anterior.');
    }
    onStage('Enviando pago de prueba…');
    const result=await request(api+'/transactions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({tx:trip.chain.xdr}).toString()});
    if(result.ok){
      const data=await result.json();if(data.hash===trip.chain.hash && data.successful===true){markPaid();return;}
    }
    if((await lookup(trip.chain.hash))==='ok'){markPaid();return;}
    throw new Error('Pago sin confirmar. Al reintentar se consultará la misma transacción.');
  }
  return {pay,api,forgetAccount:()=>{passenger=undefined;}};
})();
