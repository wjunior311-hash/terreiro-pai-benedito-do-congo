// Quem pode acessar o quê na Gestão da Casa (permissões da função administrativa).

export const PERMISSION_LABELS = [["giras.manage", "Giras", "Criar, editar e publicar giras"], ["content.manage", "Conteúdos", "Conteúdos, avisos e regras da casa"], ["finance.view", "Financeiro", "Mensalidades, cobranças e comprovantes"], ["finance.edit_payer", "Financeiro · quem paga", "Sempre / a partir de / não se aplica e configurações"], ["people.manage", "Pessoas", "Editar cadastros das pessoas"]];

export function permsOf(p) {
  if (Array.isArray(p?.perms)) return p.perms;
  if (!p) return [];
  if (p.is_master || p.role === "admin") return ["giras.manage", "content.manage", "finance.view", "finance.edit_payer", "people.manage", "admin.full"];
  return [...p.role === "editor" ? ["giras.manage", "content.manage"] : [], ...p.is_finance_manager ? ["finance.view", "finance.edit_payer"] : []];
}

export const can = (p, k) => permsOf(p).includes("admin.full") || permsOf(p).includes(k);

export const hasAnyAdmin = (p) => permsOf(p).length > 0;
