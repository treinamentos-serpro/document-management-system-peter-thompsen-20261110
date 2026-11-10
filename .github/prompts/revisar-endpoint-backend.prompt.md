---
description: Revisa um endpoint do backend do DMS quanto a contrato, arquitetura e riscos.
name: revisar-endpoint-backend
argument-hint: metodo e caminho do endpoint (ex. POST /upload)
agent: agent
---

# Revisar endpoint do backend

Revise a implementação do endpoint `${input:endpoint:metodo e caminho do endpoint}` no backend do DMS.

Antes de concluir:

- Leia as instruções do projeto e a especificação em `docs/specs/dms-spec.md`.
- Siga o fluxo `routes -> controllers -> services -> repositories` e verifique se cada camada mantém sua responsabilidade.
- Confira validação da entrada, status e formato das respostas, erros conhecidos e tratamento de falhas de filesystem.
- Para uploads, confirme o uso de `multer` com `diskStorage`, limite de tamanho e nome interno gerado pelo servidor. O armazenamento deve continuar apenas em `backend/storage`.
- Confira isolamento por dono, proteção contra exposição de caminhos locais e se os metadados permanecem em memória.
- Verifique se os testes existentes cobrem os principais casos de sucesso e erro. Não crie testes redundantes.

Não altere arquivos durante a revisão. Apresente primeiro os problemas encontrados, ordenados por gravidade, com referências aos arquivos e linhas. Para cada problema, explique o impacto e a condição que o reproduz. Se não encontrar problemas, declare isso e indique lacunas de teste ou riscos residuais.
