# Amigo Oculto de Natal 2026 🎄🎁

Site estático para publicar no GitHub Pages. Não requer servidor, conta dos convidados nem banco de dados.

## Publicação

Os arquivos públicos estão na raiz da branch `main` deste repositório.

Em **Settings → Pages**, escolha **Deploy from a branch**, `main` e `/ (root)` e salve. O endereço ficará no formato `https://sitecmpv-infotec.github.io/amigo-oculto-2026/`.

## Privacidade

Os resultados ficam cifrados com AES-256-GCM. Cada participante precisa de um código individual aleatório de alta entropia, fornecido fora do GitHub. O repositório não contém códigos nem o sorteio em texto legível. Os dados são decriptados localmente no navegador; os códigos não são transmitidos a servidores.

**Importante:** Não envie para este repositório o ZIP original, o documento do organizador nem qualquer arquivo contendo códigos ou combinações do sorteio. Um repositório GitHub público mantém histórico de alterações, mesmo após remover um arquivo.

O site não impede alguém de compartilhar o próprio código ou acesso ao resultado. Trocar ou perder códigos requer regenerar os arquivos criptografados.

## Área administrativa

Acesse **[Área do Organizador](https://sitecmpv-infotec.github.io/amigo-oculto-2026/admin.html)**.

- A senha do organizador é fornecida num arquivo privado, **fora deste repositório**. O conteúdo administrativo é cifrado com AES-GCM e derivação de chave PBKDF2 (310 mil iterações).
- É possível consultar nomes, resultados, códigos individuais e baixar uma cópia privada.
- É possível reiniciar testes **locais**. Os convidados não têm cadastro, histórico, status de leitura ou sessões guardadas no servidor.
- **Preparar um novo sorteio** cria uma nova combinação sem auto-sorteio e códigos novos, inicialmente apenas como rascunho no navegador. Os códigos devem ser baixados antes da publicação.
- Para ativar o novo sorteio, baixe ou copie o JSON gerado, edite `sorteio-criptografado.json` na branch `main`, substitua o conteúdo e confirme o commit. Os códigos anteriores deixam de funcionar após a atualização do site.

**Limitação técnica:** este é um site estático no GitHub Pages, sem backend. A senha protege a **leitura dos dados administrativos criptografados** e a preparação de rascunhos, mas não oferece autenticação de servidor nem tem permissão de gravação no GitHub. Por segurança, nenhum token de escrita é embutido na página pública. Não confunda preparar um rascunho com publicar mudanças: são etapas diferentes.

**Segurança:** nunca faça commit do arquivo de senha do administrador, dos códigos individuais, de backups com resultados em texto legível, nem de um token de acesso ao GitHub. Guarde as credenciais em local privado.
