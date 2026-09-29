/* Bittencourt Odontologia — Agência Criade
   Sem dependências. Tudo degrada bem se o JS não rodar. */
(function () {
  'use strict';

  var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- cabeçalho: fica sólido depois de rolar ---- */
  var topo = document.querySelector('.topo');
  if (topo) {
    var marcarTopo = function () {
      topo.classList.toggle('topo--fixo', window.scrollY > 40 || topo.dataset.solido === '1');
    };
    marcarTopo();
    addEventListener('scroll', marcarTopo, { passive: true });
  }

  /* ---- menu mobile ---- */
  var burger = document.querySelector('.hamburger');
  if (burger && topo) {
    burger.addEventListener('click', function () {
      var aberto = topo.classList.toggle('topo--aberto');
      burger.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      document.body.style.overflow = aberto ? 'hidden' : '';
    });
    document.querySelectorAll('.menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        topo.classList.remove('topo--aberto');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- reveal ao entrar na tela ----
     `.escreve` entra na lista porque nem todo título mora dentro de um `.rev`
     (o h1 do hero, por exemplo) — sem isso ele ficaria escondido para sempre */
  var alvos = document.querySelectorAll('.rev, .escreve');
  if (!suave || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('vis'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var atraso = parseInt(e.target.dataset.atraso || 0, 10);
        setTimeout(function () { e.target.classList.add('vis'); }, atraso);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    alvos.forEach(function (el) { obs.observe(el); });
  }

  /* ---- slideshow do hero ---- */
  var slides = document.querySelectorAll('.hero__fundo');
  // slides 2+ só entram depois do load: a 1ª dobra não paga por elas
  var carregarFundos = function () {
    document.querySelectorAll('.hero__fundo[data-fundo]').forEach(function (el) {
      el.style.backgroundImage = 'url(' + el.dataset.fundo + ')';
      delete el.dataset.fundo;
    });
  };
  if (document.readyState === 'complete') carregarFundos();
  else addEventListener('load', carregarFundos);

  if (slides.length > 1) {
    var pontos = document.querySelectorAll('.hero__ponto');
    var atual = 0, timer;
    var ir = function (n) {
      slides[atual].classList.remove('ativo');
      if (pontos[atual]) pontos[atual].classList.remove('ativo');
      atual = (n + slides.length) % slides.length;
      slides[atual].classList.add('ativo');
      if (pontos[atual]) pontos[atual].classList.add('ativo');
    };
    var tocar = function () {
      clearInterval(timer);
      if (suave) timer = setInterval(function () { ir(atual + 1); }, 6500);
    };
    pontos.forEach(function (p, i) {
      p.addEventListener('click', function () { ir(i); tocar(); });
    });
    tocar();
    // aba em segundo plano congela o timer: reancorar ao voltar
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else tocar();
    });
  }

  /* ---- comparador antes/depois ---- */
  document.querySelectorAll('.comparador').forEach(function (comp) {
    var frente = comp.querySelector('.comparador__depois');
    var alca = comp.querySelector('.comparador__alca');
    var arrastando = false;
    var pct = 50;

    var aplicar = function (novo) {
      pct = Math.min(100, Math.max(0, novo));
      frente.style.width = pct + '%';
      alca.style.left = pct + '%';
      comp.setAttribute('aria-valuenow', Math.round(pct));
    };
    var pelaPosicao = function (clientX) {
      var r = comp.getBoundingClientRect();
      aplicar(((clientX - r.left) / r.width) * 100);
    };

    comp.addEventListener('pointerdown', function (e) {
      arrastando = true;
      comp.setPointerCapture(e.pointerId);
      pelaPosicao(e.clientX);
    });
    comp.addEventListener('pointermove', function (e) {
      if (arrastando) { e.preventDefault(); pelaPosicao(e.clientX); }
    });
    var soltar = function (e) {
      if (!arrastando) return;
      arrastando = false;
      if (e.pointerId != null && comp.hasPointerCapture &&
          comp.hasPointerCapture(e.pointerId)) comp.releasePointerCapture(e.pointerId);
    };
    comp.addEventListener('pointerup', soltar);
    comp.addEventListener('pointercancel', soltar);

    // teclado: quem não usa mouse também precisa comparar
    comp.addEventListener('keydown', function (e) {
      var passo = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft') { aplicar(pct - passo); e.preventDefault(); }
      if (e.key === 'ArrowRight') { aplicar(pct + passo); e.preventDefault(); }
      if (e.key === 'Home') { aplicar(0); e.preventDefault(); }
      if (e.key === 'End') { aplicar(100); e.preventDefault(); }
    });

    // convite: uma varrida curta quando o bloco aparece pela 1a vez
    if (suave && 'IntersectionObserver' in window) {
      var visto = false;
      new IntersectionObserver(function (ents, o) {
        if (!ents[0].isIntersecting || visto) return;
        visto = true; o.disconnect();
        var passos = [50, 62, 38, 50], i = 0;
        var anda = setInterval(function () {
          aplicar(passos[i++]);
          if (i >= passos.length) clearInterval(anda);
        }, 420);
      }, { threshold: .5 }).observe(comp);
    }
  });

  /* ---- formulário -> WhatsApp (prévia estática, sem backend) ---- */
  document.querySelectorAll('form[data-zap]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var linhas = ['Olá! Vim pelo site e gostaria de agendar uma avaliação.'];
      if (d.get('nome')) linhas.push('Nome: ' + d.get('nome'));
      if (d.get('telefone')) linhas.push('WhatsApp: ' + d.get('telefone'));
      if (d.get('mensagem')) linhas.push('Mensagem: ' + d.get('mensagem'));
      window.open(form.dataset.zap + '?text=' + encodeURIComponent(linhas.join('\n')), '_blank');
    });
  });

  /* ---- contadores da faixa de confiança ---- */
  var contar = function (el) {
    // atenção: parseFloat('4,7') === 4 — o número vem em pt-BR, com vírgula
    var alvo = parseFloat(el.dataset.contar.replace(',', '.'));
    var decimais = (el.dataset.contar.split(',')[1] || '').length;
    var prefixo = el.dataset.prefixo || '';
    var sufixo = el.dataset.sufixo || '';
    var inicio = null, dur = 1500;
    var passo = function (t) {
      if (!inicio) inicio = t;
      var p = Math.min(1, (t - inicio) / dur);
      var suavizado = 1 - Math.pow(1 - p, 3);
      var v = (alvo * suavizado).toFixed(decimais).replace('.', ',');
      el.textContent = prefixo + v + sufixo;
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  var numeros = document.querySelectorAll('[data-contar]');
  if (numeros.length) {
    if (!suave || !('IntersectionObserver' in window)) {
      numeros.forEach(function (el) {
        el.textContent = (el.dataset.prefixo || '') + el.dataset.contar + (el.dataset.sufixo || '');
      });
    } else {
      var obsNum = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (!e.isIntersecting) return;
          contar(e.target);
          obsNum.unobserve(e.target);
        });
      }, { threshold: .6 });
      numeros.forEach(function (el) { obsNum.observe(el); });
    }
  }

  /* ---- parallax leve nas fotos de bloco ---- */
  var camadas = document.querySelectorAll('[data-parallax]');
  if (suave && camadas.length && !matchMedia('(max-width: 780px)').matches) {
    var pedido = false;
    var mover = function () {
      camadas.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var meio = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.transform = 'translate3d(0,' + (meio * -22).toFixed(1) + 'px,0)';
      });
      pedido = false;
    };
    addEventListener('scroll', function () {
      if (pedido) return;
      pedido = true;
      requestAnimationFrame(mover);
    }, { passive: true });
    mover();
  }

  /* ---- barra de progresso de leitura ---- */
  var barra = document.querySelector('.progresso');
  var artigo = document.querySelector('.artigo');
  if (barra && artigo) {
    var pintar = function () {
      var r = artigo.getBoundingClientRect();
      var total = r.height - innerHeight;
      var lido = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      barra.style.transform = 'scaleX(' + lido + ')';
    };
    addEventListener('scroll', pintar, { passive: true });
    pintar();
  }

  /* ---- ano do rodapé ---- */
  var ano = document.querySelector('[data-ano]');
  if (ano) ano.textContent = new Date().getFullYear();
})();
