"use strict";
// Painel estático: todo processamento é local. Nenhum token do GitHub é armazenado.
(() => {
  const $ = (selector) => document.querySelector(selector);
  const namesExpected = ["Marcela", "Rafaela", "Regina", "Joadeson", "Joel", "José"];
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const repoUrl = "https://github.com/sitecmpv-infotec/amigo-oculto-2026";
  let publicData = null;
  let vault = null;
  let adminPassword = null;
  let draft = null;
  let draftCodes = null;
  let draftAssignments = null;
  let codesDownloaded = false;

  const bytesFromBase64 = (encoded) => Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const base64FromBytes = (bytes) => {
    let result = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(result);
  };
  const enc = (value) => new TextEncoder().encode(value);
  const dec = (value) => new TextDecoder().decode(value);
  const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));
  const withDashes = (code) => code.replace(/-/g, "").replace(/.{4}(?=.)/g, "$&-");

  const randomInt = (max) => {
    if (!Number.isInteger(max) || max < 1) throw new Error("Limite inválido.");
    const ceiling = Math.floor(4294967296 / max) * max;
    const box = new Uint32Array(1);
    do { crypto.getRandomValues(box); } while (box[0] >= ceiling);
    return box[0] % max;
  };
  const createCode = () => {
    let token = "";
    for (let index = 0; index < 20; index++) token += alphabet[randomInt(alphabet.length)];
    return withDashes(token);
  };

  const deriveKey = async (password, salt) => {
    const rawKey = await crypto.subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      {name:"PBKDF2", salt, iterations:310000, hash:"SHA-256"},
      rawKey,
      {name:"AES-GCM", length:256},
      false,
      ["encrypt", "decrypt"]
    );
  };
  const decryptJSON = async (record, password) => {
    const salt = bytesFromBase64(record.salt);
    const iv = bytesFromBase64(record.iv);
    const key = await deriveKey(password, salt);
    const raw = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, bytesFromBase64(record.data));
    return JSON.parse(dec(raw));
  };
  const encryptText = async (plaintext, password) => {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, enc(plaintext));
    return {
      salt: base64FromBytes(salt),
      iv: base64FromBytes(iv),
      data: base64FromBytes(new Uint8Array(ciphertext))
    };
  };
  const validateVault = (data) => {
    if (!data || !Array.isArray(data.participants) || data.participants.length !== 6) return false;
    if (data.participants.some((n, i) => n !== namesExpected[i])) return false;
    if (!data.assignments || !data.codes) return false;
    if (new Set(Object.values(data.assignments)).size !== 6) return false;
    if (data.participants.some(n =>
      !Object.hasOwn(data.assignments, n) ||
      !Object.hasOwn(data.codes, n) ||
      data.assignments[n] === n ||
      !data.participants.includes(data.assignments[n]) ||
      !/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){4}$/.test(data.codes[n])
    )) return false;
    return true;
  };
  const fetchPublishedData = async () => {
    const response = await fetch("./sorteio-criptografado.json?t=" + Date.now(), {cache:"no-store"});
    if (!response.ok) throw new Error("O arquivo do sorteio não foi encontrado.");
    return response.json();
  };
  const login = async (e) => {
    e.preventDefault();
    const button = $("#login-button");
    const message = $("#login-message");
    button.disabled = true;
    button.textContent = "Abrindo o painel...";
    message.textContent = "";
    const password = $("#admin-password").value.trim().toUpperCase();
    try {
      if (!crypto || !crypto.subtle) throw new Error("Abra o site via HTTPS.");
      const content = await fetchPublishedData();
      if (!content.__admin__) throw new Error("Painel ainda não foi ativado no sorteio publicado.");
      const decrypted = await decryptJSON(content.__admin__, password);
      if (!validateVault(decrypted)) throw new Error("Dados de administração inválidos.");
      publicData = content;
      vault = decrypted;
      adminPassword = password;
      $("#admin-password").value = "";
      $("#login-view").hidden = true;
      $("#dashboard").hidden = false;
      renderDashboard();
      window.scrollTo({top:0, behavior:"smooth"});
    } catch (error) {
      message.textContent = error.message && error.message.includes("Painel ainda")
        ? error.message
        : error.message && error.message.includes("não foi encontrado")
          ? error.message
          : "Senha incorreta ou problema ao abrir o painel. Confira a senha e a conexão.";
    } finally {
      button.disabled = false;
      button.textContent = "🔓 Entrar no painel";
    }
  };
  const renderDashboard = () => {
    $("#metric-count").textContent = String(vault.participants.length);
    $("#draw-date").textContent = "Sorteio atual protegido. " +
      (vault.created_at ? "Referência: " + new Date(vault.created_at).toLocaleDateString("pt-BR") + "." : "");
    $("#show-matches").checked = false;
    $("#show-codes").checked = false;
    renderParticipants();
  };
  const renderParticipants = () => {
    const tbody = $("#participant-rows");
    tbody.replaceChildren();
    for (const player of vault.participants) {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = player;
      const recipient = document.createElement("td");
      const code = document.createElement("td");
      const action = document.createElement("td");
      if ($("#show-matches").checked) {
        const strong = document.createElement("strong");
        strong.textContent = vault.assignments[player];
        recipient.append(strong);
      } else {
        recipient.textContent = "🙈 Oculto";
        recipient.className = "muted-cell";
      }
      if ($("#show-codes").checked) {
        const codeText = document.createElement("code");
        codeText.textContent = vault.codes[player];
        code.append(codeText);
      } else {
        code.textContent = "•••• •••• ••••";
        code.className = "muted-cell";
      }
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "button minor";
      copy.textContent = "Copiar código";
      copy.setAttribute("data-person", player);
      copy.setAttribute("aria-label", "Copiar código individual de " + player);
      action.append(copy);
      row.append(name, recipient, code, action);
      tbody.append(row);
    }
  };
  const copyText = async (str) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(str);
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = str;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-99999px";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("Cópia automática indisponível neste navegador.");
  };
  const privateList = (participants, codes, assignments, subject) => {
    const link = "https://sitecmpv-infotec.github.io/amigo-oculto-2026/";
    const content = [
      "AMIGO OCULTO 2026 - " + subject.toUpperCase(),
      "CONFIDENCIAL: NÃO ENVIE ESTE DOCUMENTO NO GRUPO OU PUBLIQUE NO GITHUB.",
      "",
      "Link dos convidados: " + link,
      "",
      ...participants.map(p => p + ": " + codes[p]),
      "",
      "MENSAGENS PARA ENVIAR NO PRIVADO:",
      ...participants.flatMap(p => [
        "",
        "Para " + p + ":",
        "🎄 Oi, " + p + "! Seu código secreto é " + codes[p] +
        ". Acesse " + link + ", selecione seu nome e descubra quem você tirou. Guarde segredo! 🎁"
      ]),
      "",
      "CONFERÊNCIA PRIVADA DO ORGANIZADOR:",
      ...participants.map(p => p + " → " + assignments[p]),
      ""
    ];
    return content.join("\n");
  };
  const downloadFile = (name, content, mime) => {
    const file = new Blob([content], {type:mime});
    const href = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1200);
  };
  const shuffledCopy = (items) => {
    const array = items.slice();
    for (let i = array.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  const generateAssignments = () => {
    const current = vault.participants;
    for (let tries = 0; tries < 1000; tries++) {
      const recipients = shuffledCopy(current);
      if (recipients.some((recipient, index) => recipient === current[index])) continue;
      if (recipients.every((recipient, index) => recipient === vault.assignments[current[index]])) continue;
      return Object.fromEntries(current.map((person, index) => [person, recipients[index]]));
    }
    throw new Error("Não foi possível gerar um novo sorteio. Tente novamente.");
  };
  const redraw = async () => {
    if (!window.confirm(
      "Preparar um NOVO sorteio para todos os seis participantes?\n" +
      "Isto ainda não altera o site. Os códigos atuais só serão invalidados quando você publicar o novo arquivo."
    )) return;
    const button = $("#redraw-button");
    const message = $("#redraw-message");
    button.disabled = true;
    button.textContent = "Criptografando novo sorteio...";
    $("#draft-panel").hidden = true;
    message.textContent = "";
    try {
      const assignments = generateAssignments();
      const codes = Object.fromEntries(vault.participants.map(p => [p, createCode()]));
      const newRecords = {};
      for (const p of vault.participants) {
        const secret = codes[p].replace(/-/g, "");
        newRecords[p] = await encryptText(assignments[p] + "|" + base64FromBytes(randomBytes(18)), secret);
      }
      const nextVault = {
        version:1,
        participants:vault.participants,
        assignments,
        codes,
        created_at:new Date().toISOString(),
        note:"Novo sorteio preparado na área administrativa"
      };
      newRecords.__admin__ = {
        v:1,
        ...await encryptText(JSON.stringify(nextVault), adminPassword)
      };
      draft = newRecords;
      draftCodes = codes;
      draftAssignments = assignments;
      codesDownloaded = false;
      $("#draft-panel").hidden = false;
      $("#draft-panel").scrollIntoView({behavior:"smooth", block:"start"});
    } catch (error) {
      message.textContent = "Não foi possível preparar o sorteio: " + error.message;
    } finally {
      button.disabled = false;
      button.textContent = "🎁 Preparar novo sorteio";
    }
  };
  const lock = () => {
    adminPassword = null;
    vault = null;
    publicData = null;
    draft = null;
    draftCodes = null;
    draftAssignments = null;
    codesDownloaded = false;
    $("#show-matches").checked = false;
    $("#show-codes").checked = false;
    $("#participant-rows").replaceChildren();
    $("#draft-panel").hidden = true;
    $("#dashboard").hidden = true;
    $("#login-view").hidden = false;
    $("#login-message").textContent = "";
    window.scrollTo({top:0, behavior:"smooth"});
  };

  $("#login-form").addEventListener("submit", login);
  $("#lock-button").addEventListener("click", lock);
  $("#show-matches").addEventListener("change", (event) => {
    if (event.target.checked && !window.confirm("Mostrar o resultado de TODOS, incluindo o seu?")) {
      event.target.checked = false;
    }
    renderParticipants();
  });
  $("#show-codes").addEventListener("change", renderParticipants);
  $("#participant-rows").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-person]");
    if (!button) return;
    const player = button.getAttribute("data-person");
    if (!Object.hasOwn(vault.codes, player)) return;
    try {
      await copyText(vault.codes[player]);
      button.textContent = "✓ Copiado!";
      setTimeout(() => { if (button.isConnected) button.textContent = "Copiar código"; }, 1700);
    } catch (_) {
      alert("Não foi possível copiar automaticamente. Marque 'Mostrar códigos' para copiar manualmente.");
    }
  });
  $("#download-codes").addEventListener("click", () => {
    downloadFile("codigos_atuais_amigo_oculto_PRIVADO.txt",
      privateList(vault.participants, vault.codes, vault.assignments, "Códigos atuais"),
      "text/plain;charset=utf-8");
  });
  $("#clear-tests").addEventListener("click", () => {
    // A página dos convidados não armazena resultado nem status de leitura.
    sessionStorage.removeItem("amigo_oculto_teste");
    localStorage.removeItem("amigo_oculto_teste");
    $("#test-message").textContent = "Tudo limpo neste navegador. Os convidados podem repetir os testes normalmente; os códigos não foram alterados.";
  });
  $("#redraw-button").addEventListener("click", redraw);
  $("#download-new-codes").addEventListener("click", () => {
    if (!draftCodes || !vault) return;
    codesDownloaded = true;
    downloadFile("NOVOS_CODIGOS_PRIVADOS_amigo_oculto.txt",
      privateList(vault.participants, draftCodes, draftAssignments,
        "Novos códigos - rascunho"),
      "text/plain;charset=utf-8");
  });
  $("#download-json").addEventListener("click", () => {
    if (draft && !codesDownloaded) { alert("Primeiro baixe os NOVOS CÓDIGOS e guarde o arquivo privado."); return; }
    if (draft) downloadFile("sorteio-criptografado.json", JSON.stringify(draft, null, 2) + "\n", "application/json");
  });
  $("#copy-json").addEventListener("click", async (event) => {
    if (!draft) return;
    if (!codesDownloaded) { alert("Primeiro baixe os NOVOS CÓDIGOS e guarde o arquivo privado."); return; }
    try {
      await copyText(JSON.stringify(draft, null, 2) + "\n");
      event.target.textContent = "✓ JSON copiado!";
      setTimeout(() => { event.target.textContent = "📋 Copiar JSON"; }, 1800);
    } catch (_) {
      alert("Falha ao copiar. Use o botão 'Baixar JSON' e copie o conteúdo do arquivo.");
    }
  });
  $("#discard-draft").addEventListener("click", () => {
    if (!window.confirm("Descartar o novo sorteio ainda não publicado?")) return;
    draft = null;
    draftCodes = null;
    draftAssignments = null;
    codesDownloaded = false;
    $("#draft-panel").hidden = true;
    $("#redraw-message").textContent = "Rascunho descartado. O sorteio atual não foi modificado.";
  });
})();