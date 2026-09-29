/* Bittencourt Odontologia — Agência Criade
   Sem dependências. Tudo degrada bem se o JS não rodar: o <head> põe a classe
   .js e a TIRA sozinho em 2,5s se este arquivo não confirmar (window.__app). */
(function () {
  'use strict';
  window.__app = 1;

  var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouseFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // cada bloco isolado: erro num acessório não derruba os que vêm depois
  var bloco = function (fn) { try { fn(); } catch (e) { if (window.console) console.warn(e); } };
  var topo = document.querySelector('.topo');

  /* ---- cabeçalho: fica sólido depois de rolar ---- */
  bloco(function () {
    if (!topo) return;
    var marcarTopo = function () {
      topo.classList.toggle('topo--fixo', window.scrollY > 40 || topo.dataset.solido === '1');
    };
    marcarTopo();
    addEventListener('scroll', marcarTopo, { passive: true });
  });

  /* ---- menu mobile: véu, Esc, foco que entra e volta, resto da página inerte ---- */
  bloco(function () {
    var burger = document.querySelector('.hamburger');
    var menu = document.getElementById('menu');
    var veu = document.querySelector('.menu__veu');
    if (!burger || !topo || !menu) return;
    var abrir = function (sim, focoNoBotao) {
      topo.classList.toggle('topo--aberto', sim);
      burger.setAttribute('aria-expanded', sim ? 'true' : 'false');
      burger.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = sim ? 'hidden' : '';
      ['main', 'footer'].forEach(function (s) {
        var el = document.querySelector(s);
        if (el) el.inert = sim;
      });
      if (sim) {
        var a = menu.querySelector('a');
        if (a) setTimeout(function () { a.focus({ preventScroll: true }); }, 60);
      } else if (focoNoBotao) {
        burger.focus({ preventScroll: true });
      }
    };
    burger.addEventListener('click', function () { abrir(!topo.classList.contains('topo--aberto'), true); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { abrir(false, false); });
    });
    if (veu) veu.addEventListener('click', function () { abrir(false, true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topo.classList.contains('topo--aberto')) abrir(false, true);
    });
    var largo = matchMedia('(min-width: 781px)');
    var aoMudar = function (m) { if (m.matches && topo.classList.contains('topo--aberto')) abrir(false, false); };
    if (largo.addEventListener) largo.addEventListener('change', aoMudar);
  });

  /* ---- reveal ao entrar na tela ----
     `.escreve` entra na lista porque nem todo título mora dentro de um `.rev`
     (o h1 do hero, por exemplo) — sem isso ele ficaria escondido para sempre */
  bloco(function () {
    var alvos = document.querySelectorAll('.rev, .escreve');
    if (!suave || !('IntersectionObserver' in window)) {
      alvos.forEach(function (el) { el.classList.add('vis'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var atraso = parseInt(e.target.dataset.atraso || 0, 10);
        setTimeout(function () { e.target.classList.add('vis'); }, atraso);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    alvos.forEach(function (el) { obs.observe(el); });
  });

  /* ---- slideshow do hero ---- */
  bloco(function () {
    var slides = document.querySelectorAll('.hero__fundo');
    // fotos 2+ só depois do load: a 1ª dobra não paga por elas
    var carregarFundos = function () {
      document.querySelectorAll('.hero__fundo[data-src]').forEach(function (img) {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
        delete img.dataset.src;
        delete img.dataset.srcset;
      });
    };
    if (document.readyState === 'complete') carregarFundos();
    else addEventListener('load', carregarFundos);
    if (slides.length < 2) return;

    var pontos = document.querySelectorAll('.hero__ponto');
    var atual = 0, timer;
    var ir = function (n) {
      slides[atual].classList.remove('ativo');
      if (pontos[atual]) { pontos[atual].classList.remove('ativo'); pontos[atual].removeAttribute('aria-current'); }
      atual = (n + slides.length) % slides.length;
      slides[atual].classList.add('ativo');
      if (pontos[atual]) { pontos[atual].classList.add('ativo'); pontos[atual].setAttribute('aria-current', 'true'); }
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
    // foco dentro do hero pausa a troca (WCAG 2.2.2)
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('focusin', function () { clearInterval(timer); });
      hero.addEventListener('focusout', tocar);
    }
  });

  /* ---- comparador antes/depois ---- */
  bloco(function () {
    document.querySelectorAll('.comparador').forEach(function (comp) {
      var frente = comp.querySelector('.comparador__depois');
      var alca = comp.querySelector('.comparador__alca');
      var arrastando = false, rect = null, pedido = 0, xPend = 0;
      var pct = 50, convite = null, mexeu = false;

      var aplicar = function (novo) {
        pct = Math.min(100, Math.max(0, novo));
        frente.style.width = pct + '%';
        alca.style.left = pct + '%';
        comp.setAttribute('aria-valuenow', Math.round(pct));
        comp.setAttribute('aria-valuetext', Math.round(pct) + '% do antes visível');
      };
      var pararConvite = function () {
        mexeu = true;
        if (convite) { clearInterval(convite); convite = null; }
      };
      comp.addEventListener('pointerdown', function (e) {
        pararConvite();
        arrastando = true;
        rect = comp.getBoundingClientRect();        // mede 1x; nada de layout por evento
        comp.setPointerCapture(e.pointerId);
        aplicar(((e.clientX - rect.left) / rect.width) * 100);
      });
      comp.addEventListener('pointermove', function (e) {
        if (!arrastando) return;
        e.preventDefault();
        xPend = e.clientX;
        if (!pedido) pedido = requestAnimationFrame(function () {
          pedido = 0;
          aplicar(((xPend - rect.left) / rect.width) * 100);
        });
      });
      var soltar = function (e) {
        if (!arrastando) return;
        arrastando = false;
        if (e.pointerId != null && comp.hasPointerCapture && comp.hasPointerCapture(e.pointerId)) {
          comp.releasePointerCapture(e.pointerId);
        }
      };
      comp.addEventListener('pointerup', soltar);
      comp.addEventListener('pointercancel', soltar);

      // teclado: quem não usa mouse também precisa comparar
      comp.addEventListener('keydown', function (e) {
        var passo = e.shiftKey ? 10 : 4;
        var mapa = { ArrowLeft: pct - passo, ArrowRight: pct + passo, Home: 0, End: 100 };
        if (e.key in mapa) { pararConvite(); aplicar(mapa[e.key]); e.preventDefault(); }
      });
      aplicar(50);

      // convite: uma varrida curta quando o bloco aparece pela 1a vez —
      // cancelada se a pessoa já tiver começado a mexer
      if (suave && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (ents, o) {
          if (!ents[0].isIntersecting) return;
          o.disconnect();
          if (mexeu) return;
          var passos = [50, 62, 38, 50], i = 0;
          comp.classList.add('comparador--convite');
          convite = setInterval(function () {
            aplicar(passos[i++]);
            if (i >= passos.length) { clearInterval(convite); convite = null; comp.classList.remove('comparador--convite'); }
          }, 420);
        }, { threshold: .5 }).observe(comp);
      }
    });
  });

  /* ---- formulário -> WhatsApp ---- */
  bloco(function () {
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
  });

  /* ---- contadores da faixa de confiança ---- */
  bloco(function () {
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
        el.textContent = prefixo + (alvo * suavizado).toFixed(decimais).replace('.', ',') + sufixo;
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    var numeros = document.querySelectorAll('[data-contar]');
    if (!numeros.length) return;
    if (!suave || !('IntersectionObserver' in window)) {
      numeros.forEach(function (el) {
        el.textContent = (el.dataset.prefixo || '') + el.dataset.contar + (el.dataset.sufixo || '');
      });
      return;
    }
    var obsNum = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        contar(e.target);
        obsNum.unobserve(e.target);
      });
    }, { threshold: .6 });
    numeros.forEach(function (el) { obsNum.observe(el); });
  });

  /* ---- parallax leve nas fotos de bloco (escreve `transform`; a entrada usa
     `translate`, então um não apaga o outro) ---- */
  bloco(function () {
    var camadas = document.querySelectorAll('[data-parallax]');
    if (!suave || !camadas.length) return;
    var estreito = matchMedia('(max-width: 780px)');
    var pedido = false;
    var mover = function () {
      pedido = false;
      camadas.forEach(function (el) {
        if (estreito.matches) { el.style.transform = ''; return; }
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var meio = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.transform = 'translate3d(0,' + (meio * -22).toFixed(1) + 'px,0)';
      });
    };
    var pedir = function () { if (!pedido) { pedido = true; requestAnimationFrame(mover); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir, { passive: true });
    mover();
  });

  /* ---- barra de progresso de leitura ---- */
  bloco(function () {
    var barra = document.querySelector('.progresso');
    var artigo = document.querySelector('.artigo');
    if (!barra || !artigo) return;
    var pedido = false;
    var pintar = function () {
      pedido = false;
      var r = artigo.getBoundingClientRect();
      var total = r.height - innerHeight;
      var lido = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      barra.style.transform = 'scaleX(' + lido + ')';
    };
    addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(pintar); } }, { passive: true });
    pintar();
  });

  /* ---- ano do rodapé ---- */
  bloco(function () {
    var ano = document.querySelector('[data-ano]');
    if (ano) ano.textContent = new Date().getFullYear();
  });

  /* ---- toque: o iOS só dispara :active com um listener de touchstart ---- */
  bloco(function () {
    document.addEventListener('touchstart', function () {}, { passive: true });
  });

  /* ---- ímã sutil nos CTAs marcados (.btn--ima): rect lido 1x, escrita em rAF ---- */
  bloco(function () {
    if (!suave || !mouseFino) return;
    document.querySelectorAll('.btn--ima').forEach(function (b) {
      var r = null, pedido = 0, dx = 0, dy = 0;
      b.addEventListener('pointerenter', function () { r = b.getBoundingClientRect(); });
      b.addEventListener('pointermove', function (e) {
        if (!r) return;
        dx = Math.max(-6, Math.min(6, (e.clientX - r.left - r.width / 2) * .18));
        dy = Math.max(-4, Math.min(4, (e.clientY - r.top - r.height / 2) * .3));
        if (!pedido) pedido = requestAnimationFrame(function () {
          pedido = 0;
          b.style.setProperty('--ix', dx.toFixed(1) + 'px');
          b.style.setProperty('--iy', dy.toFixed(1) + 'px');
        });
      }, { passive: true });
      b.addEventListener('pointerleave', function () {
        cancelAnimationFrame(pedido); pedido = 0; r = null;
        b.style.removeProperty('--ix'); b.style.removeProperty('--iy');
      });
    });
  });

  /* ---- scrollspy do menu (só na home, onde Sobre/Serviços/Contato são âncoras) ---- */
  bloco(function () {
    if (!document.getElementById('inicio') || !('IntersectionObserver' in window)) return;
    var mapa = {};
    document.querySelectorAll('.menu a[href*="#"]').forEach(function (a) { mapa[a.hash.slice(1)] = a; });
    var ids = ['sobre', 'especialidades', 'contato'].filter(function (id) {
      return mapa[id] && document.getElementById(id);
    });
    var dentro = {};
    var marcar = function () {
      var atual = ids.filter(function (id) { return dentro[id]; }).pop() || 'inicio';
      Object.keys(mapa).forEach(function (k) {
        if (k === atual) mapa[k].setAttribute('aria-current', 'true');
        else mapa[k].removeAttribute('aria-current');
      });
    };
    var spy = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { dentro[e.target.id] = e.isIntersecting; });
      marcar();
    }, { rootMargin: '-45% 0px -50% 0px' });          // uma linha no meio da tela
    ids.forEach(function (id) { spy.observe(document.getElementById(id)); });
  });

  /* ---- spotlight nos cartões de texto + foto que anda dentro do cartão de especialidade ---- */
  bloco(function () {
    if (!suave || !mouseFino) return;
    var alvo = null, lx = 0, ly = 0, pendente = false;
    var luz = function () {
      pendente = false;
      if (!alvo) return;
      var r = alvo.getBoundingClientRect(), x = lx - r.left, y = ly - r.top;
      if (alvo.classList.contains('esp')) {
        alvo.style.setProperty('--px', ((x / r.width - .5) * -16).toFixed(1) + 'px');
        alvo.style.setProperty('--py', ((y / r.height - .5) * -12).toFixed(1) + 'px');
      } else {
        alvo.style.setProperty('--mx', x.toFixed(0) + 'px');
        alvo.style.setProperty('--my', y.toFixed(0) + 'px');
      }
    };
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      alvo = e.target.closest ? e.target.closest('.cartao, .proc__item, .depo, .esp') : null;
      lx = e.clientX; ly = e.clientY;
      if (alvo && !pendente) { pendente = true; requestAnimationFrame(luz); }
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('.esp');
      if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--px'); c.style.removeProperty('--py'); }
    }, { passive: true });
  });

  /* ---- barra de agendamento (celular): NASCE visível; o JS só a recolhe onde
     é redundante — formulário/rodapé na tela ou teclado aberto ---- */
  bloco(function () {
    var barra = document.querySelector('.barra-agenda');
    if (!barra || !('IntersectionObserver' in window)) return;
    var vendo = {}, digitando = false;
    var pintar = function () {
      var algum = Object.keys(vendo).some(function (k) { return vendo[k]; });
      barra.classList.toggle('barra-agenda--recolhida', algum || digitando);
    };
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { vendo[e.target.dataset.barra] = e.isIntersecting; });
      pintar();
    });
    document.querySelectorAll('#contato .formulario, .rodape').forEach(function (el, i) {
      el.dataset.barra = 'b' + i;
      io.observe(el);
    });
    document.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches('input, textarea')) { digitando = true; pintar(); }
    });
    document.addEventListener('focusout', function () { digitando = false; pintar(); });
  });

  /* ---- voltar ao topo: aparece quando o topo (hero/capa) sai da tela ---- */
  bloco(function () {
    var volta = document.querySelector('.volta-topo');
    var marco = document.querySelector('.hero, .capa');
    if (!volta || !marco || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (e) {
      volta.classList.toggle('volta-topo--vis', !e[0].isIntersecting);
    }).observe(marco);
  });

  /* ---- balão de chamada do WhatsApp (desktop): aparece depois de alguns segundos;
     fechado ou usado, não volta na mesma visita ---- */
  bloco(function () {
    var balao = document.querySelector('.zap-balao');
    if (!balao || matchMedia('(max-width: 780px)').matches) return;
    var CHAVE = 'bitt-balao-zap';
    var visto = function () { try { return sessionStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } };
    var marcar = function () { try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { /* sem storage: some só nesta página */ } };
    if (visto()) return;
    var esconder = function () { balao.hidden = true; balao.classList.remove('zap-balao--vis'); marcar(); };
    setTimeout(function () {
      if (visto() || document.hidden) return;
      balao.hidden = false;
      balao.classList.add('zap-balao--vis');
    }, 6000);
    balao.querySelector('.zap-balao__fechar').addEventListener('click', esconder);
    balao.querySelector('.zap-balao__link').addEventListener('click', esconder);
    var zap = document.querySelector('.zap');
    if (zap) zap.addEventListener('click', esconder);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !balao.hidden) esconder(); });
  });

  /* ---- fundo vivo: seção fora da tela pausa as manchas ---- */
  bloco(function () {
    if (!suave || !('IntersectionObserver' in window)) return;
    var secoes = document.querySelectorAll('.secao');
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { e.target.classList.toggle('fora', !e.isIntersecting); });
    }, { rootMargin: '100px 0px' });
    secoes.forEach(function (s) { io.observe(s); });
  });
})();
