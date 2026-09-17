import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base:'/terreiro-pai-benedito-do-congo/',
  plugins:[react(),{
    name:'pbc-editor-fix',
    transform(code,id){
      if(!id.endsWith('/src/appNext.jsx')) return null
      return {code:code.replace("const edit=g=>{setSelected(g);", "const edit=g=>{setSelected(null);").replace("onClick={()=>{setForm(emptyGira());setSelected('new')}}", "onClick={()=>{setForm(emptyGira());setSelected(null)}}"),map:null}
    }
  }]
})
