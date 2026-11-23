/* Neon Play — 3D racing renderer (WebGL, no third-party dependencies).
   Decorative animation only: the outcome comes from the game rules, never this renderer. */
(function (global) {
  'use strict';
  const TAU = Math.PI * 2;
  const palettes = [
    {coat:'#a75b38',mane:'#36221e',saddle:'#f04e67'},
    {coat:'#513b38',mane:'#171b27',saddle:'#4d9bff'},
    {coat:'#e2ac66',mane:'#a17a3b',saddle:'#ffc454'},
    {coat:'#7d6258',mane:'#24222a',saddle:'#9779ff'},
    {coat:'#d0d0d7',mane:'#777d8b',saddle:'#35d5a2'},
    {coat:'#35343b',mane:'#10131c',saddle:'#f3f5fa'}
  ];
  function color(hex) {
    const v = hex.replace('#','');
    return [parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255];
  }
  function matIdentity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
  function matMul(a,b){
    const out=new Float32Array(16);
    for(let c=0;c<4;c++) for(let r=0;r<4;r++)
      out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return out;
  }
  function move(x,y,z){const m=matIdentity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function size(x,y,z){const m=matIdentity();m[0]=x;m[5]=y;m[10]=z;return m;}
  function rotateX(angle){const m=matIdentity(),c=Math.cos(angle),s=Math.sin(angle);m[5]=c;m[9]=-s;m[6]=s;m[10]=c;return m;}
  function rotateZ(angle){const m=matIdentity(),c=Math.cos(angle),s=Math.sin(angle);m[0]=c;m[4]=-s;m[1]=s;m[5]=c;return m;}
  function transform(base,tx,ty,tz,sx,sy,sz,ax=0,az=0){
    let m=matMul(base,move(tx,ty,tz));
    if(ax)m=matMul(m,rotateX(ax));
    if(az)m=matMul(m,rotateZ(az));
    return matMul(m,size(sx,sy,sz));
  }
  function perspective(fov,aspect,near,far){
    const f=1/Math.tan(fov/2),o=new Float32Array(16);
    o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=(2*far*near)/(near-far);return o;
  }
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function norm(v){const n=Math.hypot(...v)||1;return v.map(x=>x/n);}
  function lookAt(eye,target,up){
    const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross(up,z)),y=cross(z,x);
    return new Float32Array([
      x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
      -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),
      -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),
      -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1
    ]);
  }
  function createMesh(gl,vertices,normals) {
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
    return {vb,nb,count:vertices.length/3};
  }
  function cubeMesh(gl){
    const faces=[
      [[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
      [[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],
      [[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
      [[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],
      [[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
      [[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]
    ],v=[],n=[];
    for(const [normal,a,b,c,d] of faces){
      for(const vertex of [a,b,c,a,c,d]){v.push(...vertex);n.push(...normal);}
    }
    return createMesh(gl,v,n);
  }
  function sphereMesh(gl){
    const v=[],n=[],seg=12,rings=9;
    for(let j=0;j<rings;j++){
      const t1=j*Math.PI/rings,t2=(j+1)*Math.PI/rings;
      for(let i=0;i<seg;i++){
        const p1=i*TAU/seg,p2=(i+1)*TAU/seg;
        function pt(t,p){return [Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];}
        const a=pt(t1,p1),b=pt(t2,p1),c=pt(t2,p2),d=pt(t1,p2);
        for(const point of [a,b,c,a,c,d]){v.push(...point);n.push(...point);}
      }
    }
    return createMesh(gl,v,n);
  }
  function cylinderMesh(gl){
    const v=[],n=[],seg=12;
    for(let i=0;i<seg;i++){
      const a=i*TAU/seg,b=(i+1)*TAU/seg;
      const nA=[Math.cos(a),0,Math.sin(a)],nB=[Math.cos(b),0,Math.sin(b)];
      const p1=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],p2=[Math.cos(b)*.5,-.5,Math.sin(b)*.5],p3=[p2[0],.5,p2[2]],p4=[p1[0],.5,p1[2]];
      for(const [p,normal] of [[p1,nA],[p2,nB],[p3,nB],[p1,nA],[p3,nB],[p4,nA]]){v.push(...p);n.push(...normal);}
      for(const [p,normal] of [[[0,.5,0],[0,1,0]],[p4,[0,1,0]],[p3,[0,1,0]], [p1,[0,-1,0]],[p2,[0,-1,0]],[[0,-.5,0],[0,-1,0]]]){v.push(...p);n.push(...normal);}
    }
    return createMesh(gl,v,n);
  }
  function compile(gl,type,src){
    const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Erro no shader');
    return sh;
  }
  class HorseRace3D {
    constructor(canvas,horses){
      this.canvas=canvas;this.horses=horses;this.positions=horses.map(()=>0);this.winner=null;this.selected='1';this.running=false;this.mode='follow';this.startAt=0;this.lastTime=0;this.active=true;
      const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
      if(!gl)throw new Error('WebGL indisponível neste dispositivo');
      this.gl=gl;
      const vs=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uVP;varying float vLight;varying float vHeight;
        void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uVP*world;vec3 normal=normalize(mat3(uModel)*aNormal);vLight=0.53+0.47*max(dot(normal,normalize(vec3(-0.35,0.85,-0.45))),0.0);vHeight=world.y;}`;
      const fs=`precision mediump float;uniform vec3 uColor;varying float vLight;varying float vHeight;
        void main(){vec3 c=uColor*(vLight+0.12);c+=vec3(0.015,0.009,0.023)*clamp(vHeight/10.0,0.0,1.0);gl_FragColor=vec4(c,1.0);}`;
      const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Erro ao iniciar o 3D');
      this.program=program;
      this.attribPosition=gl.getAttribLocation(program,'aPosition');this.attribNormal=gl.getAttribLocation(program,'aNormal');
      this.uniformModel=gl.getUniformLocation(program,'uModel');this.uniformVP=gl.getUniformLocation(program,'uVP');this.uniformColor=gl.getUniformLocation(program,'uColor');
      this.cube=cubeMesh(gl);this.sphere=sphereMesh(gl);this.cylinder=cylinderMesh(gl);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.active=false;});
      this.frame=this.frame.bind(this);
      this.raf=requestAnimationFrame(this.frame);
    }
    reset(){this.positions.fill(0);this.running=false;this.winner=null;this.startAt=0;}
    selectHorse(id){this.selected=id;}
    setPositions(arr,winnerId,running){this.positions=arr.slice();this.winner=winnerId;this.running=running;}
    toggleCamera(){this.mode=this.mode==='follow'?'side':'follow';return this.mode;}
    resize(){
      const rect=this.canvas.getBoundingClientRect();
      if(!rect.width || !rect.height)return false;
      const dpr=Math.min(window.devicePixelRatio||1,1.35);
      const w=Math.min(1100,Math.round(rect.width*dpr)),h=Math.min(720,Math.round(rect.height*dpr));
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
      this.gl.viewport(0,0,w,h);this.aspect=w/h;return true;
    }
    draw(mesh,m,colorCode){
      const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vb);gl.enableVertexAttribArray(this.attribPosition);gl.vertexAttribPointer(this.attribPosition,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.enableVertexAttribArray(this.attribNormal);gl.vertexAttribPointer(this.attribNormal,3,gl.FLOAT,false,0,0);
      gl.uniformMatrix4fv(this.uniformModel,false,m);gl.uniform3fv(this.uniformColor,colorCode);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    box(x,y,z,sx,sy,sz,hex){this.draw(this.cube,transform(matIdentity(),x,y,z,sx,sy,sz),color(hex));}
    horse(index,progress,time){
      const palette=palettes[index],x=-5+index*2,z=5+progress*78,selected=this.selected===String(index+1);
      const movement=this.running?Math.sin(time*11.8+index*.7):Math.sin(time*2+index)*.08;
      const hop=this.running?Math.abs(Math.sin(time*11.8+index*.7))*.095:Math.sin(time*2+index)*.018;
      const root=move(x,hop,z),coat=color(palette.coat),mane=color(palette.mane),saddle=color(palette.saddle);
      const lightCoat=coat.map(v=>Math.min(1,v*1.16+.02)),hoof=color('#181824');
      this.draw(this.sphere,transform(root,0,1.75,0,.57,.52,.91),coat);
      // Muzzle, neck and ears: visibly modelled and shaded in 3D.
      this.draw(this.cylinder,transform(root,0,2.12,.60,.53,1.13,.53,-.42),coat);
      this.draw(this.sphere,transform(root,0,2.58,1.02,.38,.44,.52),lightCoat);
      this.draw(this.sphere,transform(root,0,2.38,1.44,.34,.28,.39),coat);
      this.draw(this.sphere,transform(root,-.25,2.93,1.08,.105,.22,.11,-.25),mane);
      this.draw(this.sphere,transform(root,.25,2.93,1.08,.105,.22,.11,-.25),mane);
      // Mane, swinging tail and saddle patch.
      for(let k=0;k<4;k++)this.draw(this.sphere,transform(root,0,2.68-k*.16,.70-k*.12,.18,.20,.20),mane);
      this.draw(this.sphere,transform(root,0,2.16,-.03,.56,.16,.47),saddle);
      this.draw(this.sphere,transform(root,0,1.91,-1.05,.16,.18,.46,.18+movement*.13),mane);
      for(let leg=0;leg<4;leg++){
        const side=leg%2===0?-.32:.32,front=leg<2?.53:-.61;
        const phase=leg===0||leg===3?0:Math.PI;
        const step=this.running?Math.sin(time*11.8+phase+index*.7)*.62:0;
        const joint=matMul(root,matMul(move(side,1.38,front),rotateX(step)));
        this.draw(this.cylinder,transform(joint,0,-.32,0,.23,.68,.23,0),coat);
        const knee=matMul(joint,matMul(move(0,-.62,0),rotateX(-step*.57)));
        this.draw(this.cylinder,transform(knee,0,-.31,0,.17,.64,.17),lightCoat);
        this.draw(this.sphere,transform(knee,0,-.65,.07,.20,.13,.24),hoof);
      }
      // Soft ground shadow (flat dark oval) and a selected-horse guide.
      this.draw(this.sphere,transform(root,0,-hop+.052,0,.73,.025,1.09),color('#2f2529'));
      if(selected){
        this.draw(this.cube,transform(root,0,.09,0,1.35,.025,1.9),color('#caff81'));
      }
    }
    render(time){
      const gl=this.gl;if(!this.resize())return;
      gl.clearColor(.047,.083,.12,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      const focus=Math.max(...this.positions)*78;
      const chaseZ=-12+focus*.94;
      const eye=this.mode==='side'?[16.6,10.3,chaseZ+10]:[0,9.1,chaseZ];
      const target=this.mode==='side'?[0,1.7,chaseZ+14]:[0,1.5,chaseZ+20];
      const vp=matMul(perspective((this.mode==='side'?62:68)*Math.PI/180,this.aspect,.3,240),lookAt(eye,target,[0,1,0]));
      gl.uniformMatrix4fv(this.uniformVP,false,vp);
      // Track, lane colours, markers, stadium grass and illuminated fence.
      this.box(0,-.2,45,55,.2,180,'#143c3a');
      this.box(0,-.075,43,14.7,.14,174,'#ad8c68');
      for(let i=0;i<6;i++)this.box(-5+i*2,-.001,43,1.96,.018,174,i%2?'#a18365':'#b69470');
      for(let x=-6;x<=6;x+=2)this.box(x+1,.025,43,.044,.027,172,'#e5ceaa');
      for(let z=9;z<84;z+=10){
        for(let x=-5;x<=5;x+=2)this.box(x,.044,z,.15,.03,.75,'#d7b793');
      }
      // Railing and neon track posts.
      for(const x of [-7.5,7.5]){
        this.box(x,.47,44,.10,.10,180,'#dfc8a7');
        for(let z=0;z<=90;z+=9){
          this.box(x,.30,z,.13,.7,.13,'#dcc9b0');
          this.draw(this.sphere,transform(matIdentity(),x,.77,z,.17,.17,.17),color(z%18===0?'#c7ff7b':'#ad8dff'));
        }
      }
      // Finish line and overhead arch.
      for(let k=0;k<14;k++)this.box(-6.5+k,.045,83,.99,.025,1,k%2?'#ffffff':'#272536');
      this.box(-7.2,3.5,83,.27,7,.32,'#ded4e6');
      this.box(7.2,3.5,83,.27,7,.32,'#ded4e6');
      this.box(0,6.75,83,14.7,.44,.45,'#a16ff0');
      for(let i=0;i<6;i++)this.horse(i,this.positions[i],time);
    }
    frame(now){
      if(!this.active)return;
      this.raf=requestAnimationFrame(this.frame);
      if(now-this.lastTime<32)return;
      this.lastTime=now;
      if(document.hidden || this.canvas.closest('[hidden]') || !this.canvas.isConnected)return;
      try{this.render(now/1000);}catch(err){this.active=false;console.warn('WebGL 3D interrompido:',err);}
    }
  }
  global.HorseRace3D=HorseRace3D;
})(window);