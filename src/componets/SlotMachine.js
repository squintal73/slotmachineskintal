import { useState, useRef, useEffect } from 'react';
import './SlotMachine.css';

const SlotMachine = () => {
  // Configurações do jogo
  const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣', '💎'];
  const PAYTABLE = {
    '🍒🍒🍒': 10,
    '🍋🍋🍋': 8,
    '🍊🍊🍊': 8,
    '🍇🍇🍇': 15,
    '🔔🔔🔔': 20,
    '⭐⭐⭐': 25,
    '7️⃣7️⃣7️⃣': 50,
    '💎💎💎': 100,
    'default': 2
  };
  const INITIAL_BALANCE = 100;
  const MIN_BET = 5;
  const MAX_BET = 100;
  const BET_STEP = 5;

  // Estado do jogo
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [currentBet, setCurrentBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍋', '🍊']);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Refs
  const audioRefs = useRef({
    spin: null,
    win: null,
    lose: null
  });
  const reelRefs = useRef([]);
  const animationFrameIds = useRef([]);

  // Efeitos sonoros
  useEffect(() => {
    // Carrega os áudios
    audioRefs.current = {
      spin: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-slot-machine-spin-1930.mp3'),
      win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'),
      lose: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3')
    };

    // Pré-carrega os áudios
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.preload = 'auto';
        audio.load();
      }
    });

    // Limpeza
    return () => {
      // Cancela animações pendentes
      // eslint-disable-next-line
      animationFrameIds.current.forEach(id => cancelAnimationFrame(id));
      
      // Pausa todos os áudios
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  // Função para reproduzir áudio com tratamento de erro
  const playAudio = (type) => {
    const audio = audioRefs.current[type];
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(error => {
      console.error(`Erro ao reproduzir áudio ${type}:`, error);
    });
  };

  // Mostra mensagem temporária
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    
    if (text) {
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 2000);
    }
  };

  // Altera o valor da aposta
  const changeBet = (amount) => {
    const newBet = currentBet + amount;
    if (newBet >= MIN_BET && newBet <= MAX_BET && newBet <= balance) {
      setCurrentBet(newBet);
    }
  };

  // Gira um único rolo
  const spinReel = async (reelIndex, duration) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Mostra símbolo aleatório durante a animação
        setReels(prev => {
          const newReels = [...prev];
          newReels[reelIndex] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          return newReels;
        });
        
        if (progress < 1) {
          const id = requestAnimationFrame(animate);
          animationFrameIds.current.push(id);
        } else {
          // Resultado final
          setReels(prev => {
            const newReels = [...prev];
            newReels[reelIndex] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            return newReels;
          });
          resolve();
        }
      };
      
      animate();
    });
  };

  // Verifica o resultado
  const checkResult = () => {
    const combination = reels.join('');
    let winAmount = 0;
    let message = 'Tente novamente!';
    let messageType = 'lose';

    // Verifica combinações vencedoras
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Três símbolos iguais
      winAmount = currentBet * (PAYTABLE[combination] || PAYTABLE['default']);
      message = `Jackpot! ${combination} - Ganhou ${winAmount} fichas!`;
      messageType = 'win';
      
      // Animação de vitória
      reelRefs.current.forEach(reel => {
        reel?.classList.add('win-animation');
      });
      
      setTimeout(() => {
        reelRefs.current.forEach(reel => {
          reel?.classList.remove('win-animation');
        });
      }, 1000);
      
      playAudio('win');
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // Dois símbolos iguais
      winAmount = currentBet * PAYTABLE['default'];
      const symbol = reels[0] === reels[1] ? reels[0] : reels[2];
      message = `Dois ${symbol} - Ganhou ${winAmount} fichas!`;
      messageType = 'win';
      playAudio('win');
    } else {
      // Sem vitória
      playAudio('lose');
    }
    
    // Atualiza saldo e mostra mensagem
    if (winAmount > 0) {
      setBalance(prev => prev + winAmount);
    }
    showMessage(message, messageType);
  };

  // Função principal para girar os rolos
  const spin = async () => {
    if (isSpinning || balance < currentBet) {
      showMessage(balance < currentBet ? 'Saldo insuficiente!' : 'Aguarde...', 'lose');
      return;
    }
    
    // Inicia o giro
    setIsSpinning(true);
    setBalance(prev => prev - currentBet);
    showMessage('Girando...', '');
    playAudio('spin');
    
    try {
      // Gira os rolos com durações diferentes
      await Promise.all([
        spinReel(0, 750),
        spinReel(1, 1050),
        spinReel(2, 1350)
      ]);
      
      // Verifica o resultado
      checkResult();
    } catch (error) {
      console.error('Erro durante o giro:', error);
      showMessage('Erro no jogo', 'lose');
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">Caça-Níqueis Skintal</h1>
      </header>
      
      <div className="slotMachine">
        <div className="reelsContainer">
          {reels.map((symbol, index) => (
            <div
              key={index}
              ref={el => reelRefs.current[index] = el}
              className="reel"
            >
              <div className="reelSymbol">{symbol}</div>
            </div>
          ))}
        </div>
        
        <div className="controls">
          <div className="betControls">
            <button
              className="betButton"
              onClick={() => changeBet(-BET_STEP)}
              disabled={isSpinning || currentBet <= MIN_BET}
              aria-label="Diminuir aposta"
            >
              -
            </button>
            <div className="betAmount">{currentBet}</div>
            <button
              className="betButton"
              onClick={() => changeBet(BET_STEP)}
              disabled={isSpinning || currentBet >= MAX_BET || currentBet + BET_STEP > balance}
              aria-label="Aumentar aposta"
            >
              +
            </button>
          </div>
          
          <button
            className="spinButton"
            onClick={spin}
            disabled={isSpinning}
            aria-label="Girar rolos"
          >
            Girar ({currentBet})
          </button>
          
          <div className={`message ${messageType ? `${messageType}Message` : ''}`}>
            {message}
          </div>
          
          <div className="balanceContainer">
            Saldo: <span className="balance">{balance}</span> fichas
          </div>
        </div>
      </div>
      
      <div className="paytable">
        <h2>Tabela de Pagamentos</h2>
        <table>
          <thead>
            <tr>
              <th>Combinação</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PAYTABLE).map(([combo, multiplier]) => (
              <tr key={combo}>
                <td>{combo.split(' ').join(' ')}</td>
                <td>x{multiplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SlotMachine;