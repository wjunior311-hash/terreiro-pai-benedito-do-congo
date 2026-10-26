// Imagem da pessoa: avatar (com o selo do Orixá no cantinho) ou só o símbolo do Orixá.
import { useMemo } from "react";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { avatarSvg } from "./avatarArte.js";
import { novoMeuEspaco } from "./perfil.js";

export function AvatarDesenho({ cfg, className = "" }) {
  const svg = useMemo(() => avatarSvg(cfg || {}), [JSON.stringify(cfg || {})]);
  return <span className={"pa-img " + className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function PessoaAvatar({ p, size = 48, sempre = false }) {
  const usa = (sempre || novoMeuEspaco()) && p?.avatar_mode === "avatar" && p?.avatar;
  if (!usa) return <OrixaIcon name={p?.orixa_symbol} size={size} />;
  return <span className="pa" style={{ width: size, height: size }} role="img" aria-label={p?.name || "Avatar"}>
    <AvatarDesenho cfg={p.avatar} />
    <span className="pa-selo"><OrixaIcon name={p?.orixa_symbol} size={Math.max(14, Math.round(size * 0.38))} /></span>
  </span>;
}
