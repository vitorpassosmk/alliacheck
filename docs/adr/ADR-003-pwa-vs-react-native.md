# ADR-003 — PWA vs React Native

**Status:** Aceito  
**Data:** 2026-06-11

## Decisão

PWA via next-pwa.

## Motivo

- Mesmo codebase web e mobile: sem duplicação
- Install direto no celular (Add to Home Screen)
- Câmera acessível via `<input capture="environment">` sem SDK nativo
- Sem submissão a lojas de apps (App Store / Play Store)
- Reduz custo e tempo de manutenção

## Consequências

- Sem acesso a APIs nativas avançadas (NFC, Bluetooth)
- Performance inferior ao React Native em animações pesadas
- Offline limitado a cache de rotas e assets (sem sync offline complexo)
