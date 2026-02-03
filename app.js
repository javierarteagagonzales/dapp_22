const accounts = [
  {
    id: "estudiante-ana",
    name: "Ana (Estudiante)",
    eth: 3.4,
    acad: 120,
  },
  {
    id: "docente-luis",
    name: "Dr. Luis (Docente)",
    eth: 6.1,
    acad: 420,
  },
  {
    id: "tesoreria-campus",
    name: "Tesorería Campus",
    eth: 24.8,
    acad: 1200,
  },
];

let pendingTransactions = [
  "Beca para laboratorio de IA",
  "Pago de matrícula de verano",
  "Fondo para proyecto de tesis",
];

let blockHeight = 1204;
let baseGas = 32;
let congestion = 0.35;

const accountList = document.getElementById("accountList");
const fromAccount = document.getElementById("fromAccount");
const toAccount = document.getElementById("toAccount");
const txForm = document.getElementById("txForm");
const txHelper = document.getElementById("txHelper");
const blockchain = document.getElementById("blockchain");
const blockHeightEl = document.getElementById("blockHeight");
const gasPriceEl = document.getElementById("gasPrice");
const congestionFill = document.getElementById("congestionFill");
const blockTimeEl = document.getElementById("blockTime");
const pendingTxEl = document.getElementById("pendingTx");
const connectWalletBtn = document.getElementById("connectWallet");
const resetLabBtn = document.getElementById("resetLab");
const walletStatus = document.getElementById("walletStatus");
const walletNetwork = document.getElementById("walletNetwork");
const walletAddress = document.getElementById("walletAddress");
const walletBalance = document.getElementById("walletBalance");
const realTxForm = document.getElementById("realTxForm");
const realTxHelper = document.getElementById("realTxHelper");

let web3Provider;
let signer;

function formatBalance(account) {
  return `${account.eth.toFixed(2)} ETH · ${account.acad} ACAD`;
}

function renderAccounts() {
  accountList.innerHTML = "";
  accounts.forEach((account) => {
    const card = document.createElement("div");
    card.className = "account";
    card.innerHTML = `
      <div>
        <strong>${account.name}</strong>
        <span>${account.id}</span>
      </div>
      <div>
        <strong>${formatBalance(account)}</strong>
        <span>Saldo simulado</span>
      </div>
    `;
    accountList.appendChild(card);
  });

  [fromAccount, toAccount].forEach((select) => {
    select.innerHTML = "";
    accounts.forEach((account) => {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = account.name;
      select.appendChild(option);
    });
  });
  toAccount.selectedIndex = 1;
}

function updateNetworkStats() {
  blockHeightEl.textContent = `#${blockHeight}`;
  gasPriceEl.textContent = `${baseGas} gwei`;
  congestionFill.style.width = `${Math.round(congestion * 100)}%`;
  blockTimeEl.textContent = `${(12 + congestion * 6).toFixed(1)} s`;
  pendingTxEl.textContent = pendingTransactions.length;
}

function renderBlockchain() {
  blockchain.innerHTML = "";
  const blocks = [
    {
      height: blockHeight,
      title: "Bloque activo",
      txs: pendingTransactions.slice(0, 3),
    },
    {
      height: blockHeight - 1,
      title: "Bloque confirmado",
      txs: [
        "Tokenización de beca deportiva",
        "Pago de biblioteca digital",
        "Registro de curso optativo",
      ],
    },
  ];

  blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "block";
    card.innerHTML = `
      <h3>${block.title} · #${block.height}</h3>
      <ul>
        ${block.txs.map((tx) => `<li>${tx}</li>`).join("")}
      </ul>
    `;
    blockchain.appendChild(card);
  });
}

function updateHelper(message, type = "info") {
  const colors = {
    info: "#eff6ff",
    success: "#ecfdf3",
    warning: "#fff7ed",
  };
  const textColors = {
    info: "#1e3a8a",
    success: "#065f46",
    warning: "#9a3412",
  };
  txHelper.textContent = message;
  txHelper.style.background = colors[type];
  txHelper.style.color = textColors[type];
}

function estimateGasScore(gasLimit) {
  const baseline = 42000;
  return Math.min(1.5, gasLimit / baseline);
}

function addTransaction({ from, to, purpose, amount, gasLimit }) {
  const sender = accounts.find((account) => account.id === from);
  const receiver = accounts.find((account) => account.id === to);

  if (!sender || !receiver || sender === receiver) {
    updateHelper("Selecciona cuentas distintas para la simulación.", "warning");
    return;
  }

  if (sender.eth < amount) {
    updateHelper("Saldo insuficiente para completar la transacción.", "warning");
    return;
  }

  const gasScore = estimateGasScore(gasLimit);
  const fee = baseGas * gasScore * 0.000001;
  sender.eth -= amount + fee;
  receiver.eth += amount;

  const summary = `${purpose} · ${amount.toFixed(2)} ETH (${sender.name} → ${receiver.name})`;
  pendingTransactions.unshift(summary);

  congestion = Math.min(0.9, congestion + 0.08);
  baseGas = Math.min(80, Math.round(baseGas + congestion * 10));
  blockHeight += 1;

  updateHelper(
    `Transacción enviada: ${summary}. Gas estimado: ${fee.toFixed(5)} ETH.`,
    "success"
  );

  if (pendingTransactions.length > 5) {
    pendingTransactions = pendingTransactions.slice(0, 5);
  }

  renderAccounts();
  updateNetworkStats();
  renderBlockchain();
}

function resetLab() {
  accounts[0].eth = 3.4;
  accounts[0].acad = 120;
  accounts[1].eth = 6.1;
  accounts[1].acad = 420;
  accounts[2].eth = 24.8;
  accounts[2].acad = 1200;
  pendingTransactions = [
    "Beca para laboratorio de IA",
    "Pago de matrícula de verano",
    "Fondo para proyecto de tesis",
  ];
  blockHeight = 1204;
  baseGas = 32;
  congestion = 0.35;
  updateHelper("Laboratorio reiniciado. Simulación lista para otra clase.", "info");
  renderAccounts();
  updateNetworkStats();
  renderBlockchain();
}

async function connectWallet() {
  if (!window.ethereum || !window.ethers) {
    walletStatus.textContent = "Wallet no detectada. Instala MetaMask para conectar.";
    return;
  }

  try {
    web3Provider = new window.ethers.providers.Web3Provider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    signer = web3Provider.getSigner();
    await refreshWalletDetails();
  } catch (error) {
    walletStatus.textContent = "No se pudo conectar la wallet.";
  }
}

async function refreshWalletDetails() {
  if (!web3Provider || !signer) {
    return;
  }
  const address = await signer.getAddress();
  const balance = await web3Provider.getBalance(address);
  const network = await web3Provider.getNetwork();
  walletStatus.textContent = "Wallet conectada correctamente.";
  walletNetwork.textContent = `Red: ${network.name} (${network.chainId})`;
  walletAddress.textContent = address;
  walletBalance.textContent = `${window.ethers.utils.formatEther(balance)} ETH`;
  realTxHelper.textContent = "Listo para enviar una transacción real.";
}

async function sendRealTransaction({ to, amount }) {
  if (!signer) {
    realTxHelper.textContent = "Conecta la wallet antes de enviar.";
    return;
  }
  realTxHelper.textContent = "Enviando transacción...";
  try {
    const tx = await signer.sendTransaction({
      to,
      value: window.ethers.utils.parseEther(amount),
    });
    realTxHelper.textContent = `Transacción enviada: ${tx.hash}`;
    await tx.wait();
    await refreshWalletDetails();
  } catch (error) {
    realTxHelper.textContent = "No se pudo enviar la transacción.";
  }
}

txForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.getElementById("amount").value);
  const gasLimit = Number(document.getElementById("gasLimit").value);
  addTransaction({
    from: fromAccount.value,
    to: toAccount.value,
    purpose: document.getElementById("txPurpose").value,
    amount,
    gasLimit,
  });
});

connectWalletBtn.addEventListener("click", connectWallet);
resetLabBtn.addEventListener("click", resetLab);

realTxForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const to = document.getElementById("realTo").value.trim();
  const amount = document.getElementById("realAmount").value.trim();
  sendRealTransaction({ to, amount });
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    connectWallet();
  });
  window.ethereum.on("chainChanged", () => {
    connectWallet();
  });
}

renderAccounts();
updateNetworkStats();
renderBlockchain();
updateHelper("Completa el formulario para simular una transacción académica.");
