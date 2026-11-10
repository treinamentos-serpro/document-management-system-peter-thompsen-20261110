# Especificação - Document Management System

> Especificação funcional e técnica para orientar a implementação incremental do DMS.
> Este documento descreve o comportamento esperado; sua criação não implementa as etapas de backend ou frontend.

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos por uma interface web, armazenando os arquivos no filesystem local e mantendo seus metadados em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, restrito ao seu dono.
- Exibição de nome original, tamanho e data do upload.
- Interface web para as operações acima.
- Armazenamento dos arquivos em `backend/storage` com `multer` e `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Banco de dados ou persistência durável dos metadados.
- Autenticação, cadastro, recuperação de senha ou gestão de sessões.
- Compartilhamento de documentos entre usuários.
- Versionamento, edição, exclusão ou organização em pastas.
- Pré-visualização, conversão, indexação ou busca no conteúdo dos arquivos.
- Verificação antivírus ou classificação do conteúdo enviado.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição usando `multipart/form-data` no campo `file`. | Com arquivo válido e identidade de usuário presente, responde `201` com os metadados criados. |
| RF-02 | O sistema deve rejeitar upload sem arquivo, com campo diferente de `file` ou acima do limite configurado. | Responde com erro JSON e status documentado, sem registrar metadados de um upload malsucedido. |
| RF-03 | O sistema deve atribuir um identificador único e um nome interno seguro a cada arquivo. | O identificador não se repete entre documentos mantidos no processo; o nome enviado pelo usuário não é usado como caminho de gravação. |
| RF-04 | O sistema deve registrar os metadados do documento após a gravação local bem-sucedida. | Os metadados retornados correspondem ao arquivo gravado e incluem seu dono. |
| RF-05 | O usuário deve poder listar seus próprios documentos. | A resposta contém somente documentos cujo `owner` corresponde à identidade da requisição; lista vazia é válida. |
| RF-06 | O usuário deve poder baixar um documento próprio pelo identificador. | O conteúdo baixado corresponde ao arquivo gravado, com cabeçalho de download e nome original. |
| RF-07 | O sistema deve impedir que um usuário liste ou baixe documentos pertencentes a outro usuário. | Um documento de outro usuário é tratado como não encontrado, sem revelar sua existência. |
| RF-08 | O sistema deve informar falhas de entrada, ausência de documento e erros de armazenamento com respostas previsíveis. | Cada falha retorna status e código de erro definidos neste documento, sem expor caminhos internos ou stack traces. |
| RF-09 | O frontend deve permitir selecionar e enviar um arquivo, apresentar o resultado e atualizar a listagem. | O estado de carregamento, sucesso e erro é visível; a lista reflete uploads concluídos com sucesso. |
| RF-10 | O frontend deve permitir baixar um item da listagem. | A ação requisita o endpoint de download e inicia o recebimento do arquivo. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados somente no filesystem local da aplicação, em `backend/storage`, usando `multer` com `diskStorage`. Não integrar provedores externos. |
| RNF-02 | Os metadados devem ser mantidos em memória. Ao reiniciar o processo, a lista e o vínculo de metadados não são preservados, mesmo que arquivos permaneçam no diretório local. |
| RNF-03 | A configuração operacional deve usar variáveis de ambiente quando aplicável, seguindo o princípio 12-Factor. |
| RNF-04 | A camada de interface HTTP deve validar entradas e converter erros conhecidos em respostas estáveis; detalhes internos não devem ser enviados ao cliente. |
| RNF-05 | O nome original do arquivo deve ser tratado como dado não confiável e nunca concatenado diretamente ao caminho de armazenamento. |
| RNF-06 | As rotas devem operar com identidade de usuário em todas as operações de documentos. O mecanismo provisório especificado abaixo não equivale a autenticação e não deve ser considerado seguro para produção. |
| RNF-07 | O backend deve ser implementado em JavaScript/CommonJS com Express e testes no runner nativo `node:test`; o frontend usa React, Vite e `fetch`. |
| RNF-08 | Não são introduzidas dependências novas quando as dependências existentes atendem ao requisito. |

### Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de armazenamento. Deve permanecer dentro do ambiente local da aplicação; não representa suporte a armazenamento externo. |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MiB) | Limite máximo por arquivo. Valor deve ser inteiro positivo. |

A configuração do Vite encaminha `/api` ao backend e remove esse prefixo. Assim, os caminhos públicos de desenvolvimento são `/api/upload`, `/api/documents` e `/api/documents/:id/download`, enquanto os caminhos registrados no backend são os definidos na seção 6. O prefixo `/api` não faz parte dos caminhos do backend.

## 5. Modelo de dados

### Documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, gerado pelo servidor (UUID v4). |
| `originalName` | string | Sim | Nome original fornecido pelo cliente, preservado apenas como metadado e nome sugerido no download. |
| `size` | number | Sim | Tamanho do arquivo em bytes, obtido do arquivo gravado. |
| `uploadedAt` | string | Sim | Data e hora do upload concluído, em ISO 8601 UTC. |
| `owner` | string | Sim | Identificador do usuário associado à requisição. |
| `storageName` | string | Sim, interno | Nome gerado pelo servidor para o arquivo no diretório local. Não deve ser retornado pela API. |

Os metadados são armazenados em memória, indexados por `id`. A propriedade `storageName` liga o registro ao arquivo local. A implementação deve registrar o metadado somente após a gravação do arquivo concluir. Caso uma falha posterior impeça o registro, a implementação deve evitar deixar arquivo parcial sempre que possível.

### Identidade provisória

Nesta fase, a identidade é recebida pelo cabeçalho `X-User-Id`. O valor deve ser uma string não vazia, após remoção de espaços nas extremidades, com no máximo 100 caracteres. Requisições sem o cabeçalho ou com valor inválido recebem `401` com `USER_ID_REQUIRED`.

Esse cabeçalho é somente um mecanismo de desenvolvimento para exercitar a separação por dono. Como o cliente pode escolher seu próprio valor, ele não autentica nem autoriza usuários reais. A implantação em produção exige uma decisão de autenticação fora do escopo desta especificação.

## 6. Contratos de API

Todas as rotas abaixo são relativas à raiz do backend. O cliente web usa `/api` como prefixo por causa do proxy do Vite. Exceto quando indicado, as respostas de erro usam `Content-Type: application/json`.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`code` é estável para uso pelo cliente. `message` é uma mensagem legível em português. Respostas não devem incluir stack trace, caminhos locais ou detalhes da infraestrutura.

### `POST /upload`

Envia um arquivo pertencente ao usuário identificado por `X-User-Id`.

- Cabeçalho obrigatório: `X-User-Id`.
- Corpo: `multipart/form-data` com exatamente um arquivo no campo `file`.
- Limite: `MAX_FILE_SIZE_BYTES`; qualquer tipo de arquivo é aceito nesta fase, sem lista de extensões permitidas.
- O servidor deve gerar `id` e `storageName`; nunca usar `originalName` como caminho físico.

Sucesso: `201 Created`.

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

Erros:

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Arquivo ausente ou campo `file` ausente. |
| `400` | `INVALID_UPLOAD` | Requisição multipart inválida ou mais de um arquivo enviado. |
| `401` | `USER_ID_REQUIRED` | Cabeçalho de identidade ausente ou inválido. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede `MAX_FILE_SIZE_BYTES`. |
| `500` | `STORAGE_ERROR` | Falha ao criar diretório ou gravar o arquivo. |

### `GET /documents`

Lista os documentos do usuário identificado por `X-User-Id`, sem parâmetros de consulta nesta versão.

- Cabeçalho obrigatório: `X-User-Id`.
- Ordenação: `uploadedAt` decrescente; em empate, `id` crescente.
- A resposta não inclui `storageName`.

Sucesso: `200 OK`.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-11-10T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Se não houver documentos, retorna `200` com `{"documents": []}`. Sem identidade válida, retorna `401 USER_ID_REQUIRED`.

### `GET /documents/:id/download`

Baixa um documento próprio pelo `id`.

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, corpo binário do arquivo.
- `Content-Type`: tipo detectado para o arquivo ou `application/octet-stream` se não puder ser determinado.
- `Content-Disposition`: `attachment` com o nome original codificado corretamente; o nome deve ser sanitizado para o cabeçalho, impedindo injeção de cabeçalhos.
- Não retornar o caminho local nem o nome interno de armazenamento.

Erros:

| Status | Código | Condição |
| --- | --- | --- |
| `401` | `USER_ID_REQUIRED` | Cabeçalho de identidade ausente ou inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | ID inexistente, documento de outro usuário ou arquivo local ausente. |
| `500` | `STORAGE_ERROR` | Falha de leitura não causada pela ausência do arquivo. |

A resposta `404` para ID inexistente e documento de outro usuário é intencional para não revelar documentos alheios.

### Endpoint existente de saúde

`GET /health` retorna `200` com `{"status":"ok"}` e não exige identidade. É uma verificação operacional, não uma operação sobre documentos.

## 7. Decisões arquiteturais

### Backend

Manter a Clean Architecture simples indicada pelo projeto, com fluxo de dependências em uma direção:

- `routes/`: registra caminhos, métodos e middleware de upload e encaminha a requisição.
- `controllers/`: valida a entrada HTTP, lê identidade e parâmetros, chama os serviços e define status, cabeçalhos e formato das respostas.
- `services/`: implementa regras de negócio, como atribuição do dono, criação de metadados, filtragem por usuário e tratamento do fluxo de download.
- `repositories/`: encapsula o acesso aos metadados em memória e aos arquivos no filesystem local.

As camadas internas não dependem de Express. O armazenamento de arquivos é local, realizado com `multer` configurado com `diskStorage`; multer não substitui a validação do contrato nem as regras de propriedade. Erros de multer e do filesystem devem ser traduzidos na fronteira HTTP para os códigos definidos nesta especificação.

### Frontend

Usar componentes funcionais React e a organização existente por páginas, componentes e serviços. O acesso ao backend é feito por `fetch` com caminhos sob `/api`; o proxy de desenvolvimento encaminha as chamadas ao backend local. A camada de interface deve apresentar mensagens em português e não deve depender do nome interno de armazenamento.

### Persistência e limitações

Arquivos são gravados no diretório local configurado, com padrão `backend/storage`. Metadados existem somente enquanto o processo está ativo. Após reinício, os registros em memória desaparecem; arquivos antigos podem permanecer sem metadados e não ficam disponíveis pela API. Recuperação automática desses arquivos órfãos não faz parte do escopo.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro em nível de comportamento. Esta especificação não executa nem altera arquivos de implementação do backend ou frontend.

1. Estabelecer configuração do servidor, diretório local e limites de upload; validar variáveis de ambiente e manter o endpoint de saúde.
2. Implementar o fluxo de upload local com `multer` e `diskStorage`, geração de identificador/nome interno, metadados em memória e tratamento de erros.
3. Implementar listagem filtrada pelo dono e download com verificação de propriedade, cabeçalhos seguros e tratamento de arquivo ausente.
4. Cobrir contratos e regras do backend com testes automatizados para sucesso, validação, isolamento por usuário e falhas de armazenamento.
5. Implementar a interface de upload, listagem, estados de carregamento/erro e ação de download usando os endpoints pelo proxy `/api`.
6. Validar o fluxo integrado no navegador e revisar os critérios de aceite, a configuração local e as limitações de identidade e persistência.

## 9. Critérios de aceite do sistema

- Upload válido produz arquivo no armazenamento local e metadados com todos os campos públicos previstos.
- Upload sem arquivo, multipart inválido e arquivo acima do limite retornam os status e códigos definidos.
- A listagem apresenta somente documentos do usuário e ordena os resultados conforme o contrato.
- Download de documento próprio devolve o conteúdo e nome original; documento alheio, inexistente ou sem arquivo retorna `404`.
- Respostas de erro não expõem stack traces nem caminhos locais.
- O frontend consegue enviar, listar e baixar arquivos pelo proxy configurado.
- Nenhuma etapa usa armazenamento externo; os metadados permanecem em memória e a limitação após reinicialização é documentada.
