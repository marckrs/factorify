# CLAUDE.md — UnifyStudio

## Herda
Todas as regras de /CLAUDE.md (raiz)

## Específico deste Produto
- Plugin Figma: respeitar QuickJS — usar Object.assign, nunca Object Spread
- Versionar funções: smartResizeV5, generateKvV3 — nunca sobrescrever
- Layout engine V5: escala relativa 0.65x — nunca % fixo de largura
- UI: glassmorphism, soft gradients, toasts 3s auto-dismiss no bottom-left
- Figma plugin API: testar em sandbox antes de cada release

## Stack
- TypeScript + esbuild para o plugin
- React.js + Tailwind CSS para UI
- Figma REST API para operações de leitura/escrita
- Hugging Face para IA generativa (Stable Diffusion + ControlNet)

## Repo
github.com/marckrs/UnifyStudio (separado do monorepo principal)
