// ============================================================================
// LIMPEZA TOTAL DE CACHE E SESSÃO
// ============================================================================
// Execute no CONSOLE DO NAVEGADOR (F12 → Console)
// ============================================================================

// 1. Limpar TODA a sessão do Supabase
await supabase.auth.signOut();

// 2. Limpar localStorage
localStorage.clear();

// 3. Limpar sessionStorage
sessionStorage.clear();

// 4. Verificar limpeza
console.log('LocalStorage limpo:', localStorage.length === 0 ? '✅' : '❌');
console.log('SessionStorage limpo:', sessionStorage.length === 0 ? '✅' : '❌');

// 5. Recarregar página
setTimeout(() => {
    window.location.href = '/login';
}, 500);

// ============================================================================
// RESULTADO: Página vai recarregar na tela de login
// Faça login novamente e agora vai aparecer como Admin!
// ============================================================================
