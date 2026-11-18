/**
 * 回答画面（index.html）
 *   - 現在の安否確認イベントの表示
 *   - 入力チェック（HTML の検証属性 + 表示制御）
 *   - 送信・完了表示
 */
(() => {
  'use strict';

  const { api, formatDateTime } = window.SafetyApp;
  const STORAGE_KEY = 'safety-last-empid'; // 次回入力を楽にするため社員番号のみ保存（確認コードは保存しない）

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('answerForm');
    const doneView = document.getElementById('doneView');
    const submitBtn = form.querySelector('[data-submit]');
    const messageEl = form.querySelector('[data-form-message]');
    const comment = form.elements.comment;
    const counter = form.querySelector('[data-counter]');

    /* ---------- イベント情報の取得 ---------- */
    const loadEvent = async () => {
      const titleEl = document.querySelector('[data-event-title]');
      const metaEl = document.querySelector('[data-event-meta]');
      try {
        const { event } = await api('getEvent');
        if (!event) {
          titleEl.textContent = '現在、実施中の安否確認はありません';
          submitBtn.disabled = true;
          return;
        }
        titleEl.textContent = event.title;
        metaEl.textContent = `開始：${formatDateTime(event.startedAt)}`;
      } catch (err) {
        titleEl.textContent = '安否確認';
        metaEl.textContent = '情報を取得できませんでしたが、回答は送信できます。';
      }
    };

    /* ---------- 前回の社員番号を復元 ---------- */
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) form.elements.empId.value = last;
    } catch (e) { /* private モード等 */ }

    /* ---------- 文字数カウンター ---------- */
    comment.addEventListener('input', () => {
      counter.textContent = comment.value.length;
    });

    /* ---------- 数字以外を自動で除去（全角数字は半角へ） ---------- */
    ['empId', 'pin'].forEach((name) => {
      form.elements[name].addEventListener('input', (e) => {
        const el = e.target;
        el.value = el.value
          .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
          .replace(/\D/g, '');
      });
    });

    /* ---------- バリデーション ---------- */
    // 1項目のエラー表示を切り替える
    const setInvalid = (name, invalid) => {
      const target = form.querySelector(`[data-error-for="${name}"]`);
      if (!target) return;
      const wrapper = target.closest('.field') || target.closest('.form__group');
      wrapper.classList.toggle('is-invalid', invalid);
    };

    const validate = () => {
      const names = ['empId', 'pin', 'status', 'location', 'work'];
      let firstInvalid = null;
      names.forEach((name) => {
        const el = form.elements[name];
        // RadioNodeList はラジオの1つ目で validity を確認
        const input = el instanceof RadioNodeList ? el[0] : el;
        const invalid = !input.checkValidity();
        setInvalid(name, invalid);
        if (invalid && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      return !firstInvalid;
    };

    // 入力し直したらその項目のエラーを消す
    form.addEventListener('change', (e) => {
      if (e.target.name && e.target.checkValidity()) setInvalid(e.target.name, false);
    });

    /* ---------- 送信 ---------- */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      messageEl.textContent = '';
      if (!validate()) return;

      const data = Object.fromEntries(new FormData(form));
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      try {
        const result = await api('answer', {
          empId: data.empId,
          pin: data.pin,
          status: data.status,
          location: data.location,
          work: data.work,
          family: data.family || '',
          comment: (data.comment || '').trim()
        });

        try { localStorage.setItem(STORAGE_KEY, data.empId); } catch (err) { /* noop */ }

        // 完了表示へ切り替え
        doneView.querySelector('[data-done-name]').textContent = result.name;
        doneView.querySelector('[data-done-time]').textContent = `受付：${formatDateTime(result.answeredAt)}`;
        form.hidden = true;
        doneView.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        doneView.focus({ preventScroll: true });
      } catch (err) {
        messageEl.textContent = err.message;
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });

    /* ---------- 回答し直す ---------- */
    doneView.querySelector('[data-answer-again]').addEventListener('click', () => {
      form.elements.pin.value = '';
      doneView.hidden = true;
      form.hidden = false;
      form.elements.pin.focus();
    });

    loadEvent();
  });
})();
