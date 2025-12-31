// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Configuração de CORS (Permite que seu site converse com a função)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Cria o Cliente Admin do Supabase (Usa a chave secreta do servidor)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Recebe os dados do Front-end
    const { email, password, patient_id, name } = await req.json()

    // Validação básica
    if (!email || !password || !patient_id) {
      throw new Error("Dados incompletos: Email, senha e ID do paciente são obrigatórios.")
    }

    // 4. Cria o Usuário no Auth (Autenticação)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Já confirma o e-mail automaticamente
      user_metadata: { full_name: name }
    })

    if (userError) throw userError

    // 5. Cria o Perfil na tabela 'profiles' e vincula ao paciente
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id, // O ID gerado pelo Auth
        email: email,
        role: 'patient',      // Define como Paciente
        patient_id: patient_id, // Vincula ao prontuário médico
        name: name
      })

    if (profileError) {
      // Se der erro ao criar o perfil, apaga o usuário do Auth para não ficar "lixo"
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw profileError
    }

    // 6. Sucesso!
    return new Response(
      JSON.stringify({ message: 'Usuário criado com sucesso!', user: userData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})