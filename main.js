import { createApp, computed, nextTick, ref, watch } from 'vue/dist/vue.esm-bundler.js'
import chapters from './questions.js'
import './style.css'

if (import.meta.env.PROD && location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  const workerUrl = new URL(/* @vite-ignore */ '../sw.js', import.meta.url)
  navigator.serviceWorker.register(workerUrl.href).catch(error => {
    console.warn('오프라인 사용 준비에 실패했습니다.', error)
  })
}

const storageKey = 'grammar-300-attempts-v1'
const letters = 'ABCD'
const label = index => String(index + 1).padStart(2, '0')

function restore() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {}
  } catch {
    return {}
  }
}

createApp({
  setup() {
    const records = ref(restore())
    const view = ref('home')
    const chapter = ref(0)
    const current = ref(0)
    const filter = ref('all')
    const storageError = ref(false)
    const heading = ref(null)
    const questions = computed(() => chapters[chapter.value])
    const question = computed(() => questions.value[current.value])
    const record = computed(() => records.value[chapter.value])
    const selected = computed(() => record.value?.draft[current.value])
    const answered = computed(() => Object.keys(record.value?.draft || {}).length)
    const completed = computed(() => Object.values(records.value).filter(entry => entry.result).length)
    const wrong = computed(() => chapters.flatMap((items, index) => {
      const result = records.value[index]?.result
      return result ? items.filter((item, position) => item.answer !== result.answers[position])
        .map(item => ({ ...item, chapter: index, chosen: result.answers[item.number - 1] })) : []
    }))
    const filteredWrong = computed(() => wrong.value.filter(item => filter.value === 'all' || item.chapter === filter.value))

    watch(records, value => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value))
        storageError.value = false
      } catch {
        storageError.value = true
      }
    }, { deep: true })

    function focusHeading() {
      nextTick(() => {
        window.scrollTo(0, 0)
        heading.value?.focus({ preventScroll: true })
      })
    }

    function show(page) {
      view.value = page
      focusHeading()
    }

    function open(index) {
      chapter.value = index
      records.value[index] ??= { draft: {}, cursor: 0, result: null }
      current.value = record.value.cursor
      show(record.value.result && !answered.value ? 'result' : 'quiz')
    }

    function go(index) {
      current.value = index
      record.value.cursor = index
      focusHeading()
    }

    function select(index) {
      record.value.draft[current.value] = index
    }

    function submit() {
      if (answered.value !== questions.value.length) {
        go(questions.value.findIndex((_, index) => record.value.draft[index] === undefined))
        return
      }
      const answers = { ...record.value.draft }
      const correct = questions.value.filter((item, index) => item.answer === answers[index]).length
      Object.assign(record.value, { result: { answers, correct }, draft: {}, cursor: 0 })
      show('result')
    }

    function review(index = 'all') {
      filter.value = index
      show('review')
    }

    function retry() {
      current.value = 0
      show('quiz')
    }

    return {
      chapters, records, view, chapter, current, questions, question, record, selected, answered,
      completed, wrong, filteredWrong, filter, storageError, heading, label, letters,
      show, open, go, select, submit, review, retry,
    }
  },
  template: `
    <header class="topbar">
      <div class="wrap header-inner">
        <button class="brand" @click="show('home')" aria-label="문법 300제 홈"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h5a3 3 0 0 1 3 3v11a4 4 0 0 0-3-1.5H4zM20 5.5h-5a3 3 0 0 0-3 3v11a4 4 0 0 1 3-1.5h5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span> 문법 300제</button>
        <nav aria-label="주 메뉴">
          <button :class="{active: view !== 'review'}" @click="show('home')">문제 풀기</button>
          <button :class="{active: view === 'review'}" @click="review()">오답노트 <span v-if="wrong.length" class="count">{{ wrong.length }}</span></button>
        </nav>
      </div>
    </header>
    <main class="wrap">
      <p v-if="storageError" role="alert" class="warning">브라우저에 진도를 저장할 수 없습니다. 페이지를 닫으면 이번 풀이가 사라질 수 있습니다.</p>
      <template v-if="view === 'home'">
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">TOEIC PART 5</span>
            <h1 ref="heading" tabindex="-1">토익 필수문법 <em>300제</em></h1>
            <p>한 챕터씩 30문제를 풀고, 틀린 문제는 오답노트에서 복습하세요.</p>
            <div class="hero-stats"><span><strong>{{ completed }}</strong> / 10 챕터 완료</span><span><strong>{{ wrong.length }}</strong> 개의 오답</span></div>
          </div>
          <div class="hero-art" aria-hidden="true"><div class="paper back"></div><div class="paper front"><span>Aa</span><i></i><i></i><i></i><b>✓</b></div></div>
        </section>
        <section class="chapters" aria-labelledby="chapter-list">
          <div class="section-title"><h2 id="chapter-list">챕터 선택</h2><span>10개 챕터 · 각 30문항</span></div>
          <div class="chapter-grid">
            <button v-for="(_, index) in chapters" :key="index" class="chapter-card" @click="open(index)">
              <span class="chapter-number">{{ label(index) }}</span>
              <span class="chapter-copy"><strong>챕터 {{ label(index) }}</strong>
                <span v-if="records[index] && Object.keys(records[index].draft).length">{{ Object.keys(records[index].draft).length }} / 30문항 풀이 중</span>
                <span v-else-if="records[index]?.result" class="done">완료 · {{ records[index].result.correct }} / 30 정답</span>
                <span v-else>30문항</span>
              </span>
              <span class="arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </template>
      <template v-else-if="view === 'quiz'">
        <button class="back-link" @click="show('home')">← 챕터 선택</button>
        <div class="quiz-layout">
          <section class="panel quiz-card">
            <div class="section-title"><span class="eyebrow">챕터 {{ label(chapter) }}</span><span>{{ current + 1 }} / 30</span></div>
            <progress :value="answered" max="30" aria-label="답안 선택 진행률"></progress>
            <h1 ref="heading" tabindex="-1" class="question-heading">{{ current + 1 }}번 문제</h1>
            <p class="stem" lang="en">{{ question.stem }}</p>
            <div class="options" role="group" aria-label="보기">
              <button v-for="(choice, index) in question.choices" :key="index" class="choice" :class="{picked: selected === index}" :aria-pressed="selected === index" @click="select(index)">
                <span class="letter">{{ letters[index] }}</span><span lang="en">{{ choice }}</span><span v-if="selected === index" class="check" aria-hidden="true">✓</span>
              </button>
            </div>
            <div class="actions">
              <button class="secondary" :disabled="current === 0" @click="go(current - 1)">← 이전</button>
              <button v-if="current < 29" class="primary" @click="go(current + 1)">다음 문제 →</button>
              <button v-else class="primary" @click="submit">{{ answered === 30 ? '제출하고 채점' : '미응답 문제 풀기' }}</button>
            </div>
          </section>
          <aside class="panel navigator">
            <div class="section-title"><h2>문항 이동</h2><span>{{ answered }} / 30 응답</span></div>
            <div class="question-grid">
              <button v-for="(_, index) in questions" :key="index" :aria-current="current === index ? 'step' : undefined" :aria-label="(index + 1) + '번 문제' + (record.draft[index] === undefined ? '' : ', 답안 선택됨')" :class="{filled: record.draft[index] !== undefined, current: current === index}" @click="go(index)">{{ index + 1 }}</button>
            </div>
            <button class="primary full" :disabled="answered !== 30" @click="submit">제출하고 채점</button>
          </aside>
        </div>
      </template>
      <template v-else-if="view === 'result'">
        <button class="back-link" @click="show('home')">← 챕터 선택</button>
        <section class="panel result">
          <span class="eyebrow">챕터 {{ label(chapter) }}</span>
          <h1 ref="heading" tabindex="-1">채점 결과</h1>
          <div class="score"><strong>{{ record.result.correct }}</strong> / 30</div>
          <p>{{ record.result.correct === 30 ? '30문제 모두 맞혔어요!' : (30 - record.result.correct) + '문제를 틀렸어요.' }}</p>
          <div class="result-actions">
            <button class="secondary" @click="retry">다시 풀기</button>
            <button class="primary" v-if="record.result.correct !== 30" @click="review(chapter)">틀린 문제 복습 →</button>
            <button class="primary" v-else @click="show('home')">챕터 선택 →</button>
          </div>
        </section>
      </template>
      <template v-else>
        <div class="review-header">
          <div><h1 ref="heading" tabindex="-1">오답노트</h1><p>최근 제출한 챕터별 오답을 문제와 해설로 다시 확인하세요.</p></div>
          <label class="filter">챕터 <select v-model="filter"><option value="all">전체 챕터</option><option v-for="(_, index) in chapters" :key="index" :value="index">챕터 {{ label(index) }}</option></select></label>
        </div>
        <div v-if="!filteredWrong.length" class="panel empty">
          <h2>복습할 오답이 없어요</h2>
          <p>{{ completed ? '다른 챕터를 선택하거나 문제 풀이를 이어가세요.' : '챕터를 풀고 제출하면 여기에 틀린 문제가 표시됩니다.' }}</p>
          <button class="primary" @click="show('home')">챕터 선택 →</button>
        </div>
        <div v-else class="review-list">
          <article v-for="item in filteredWrong" :key="item.chapter + '-' + item.number" class="panel review-card">
            <div class="review-question">
              <span class="eyebrow">챕터 {{ label(item.chapter) }} · {{ item.number }}번</span>
              <h2 class="stem" lang="en">{{ item.stem }}</h2>
              <ul class="review-options">
                <li v-for="(choice, index) in item.choices" :key="index" :class="{correct: index === item.answer, incorrect: index === item.chosen}">
                  <span class="letter">{{ letters[index] }}</span><span lang="en">{{ choice }}</span>
                  <strong v-if="index === item.answer">정답</strong><strong v-else-if="index === item.chosen">내 답</strong>
                </li>
              </ul>
            </div>
            <div class="explanation">
              <h3>해설</h3><p>{{ item.explanation }}</p>
              <h3>해석</h3><p>{{ item.translation }}</p>
              <template v-if="item.vocabulary"><h3>어휘</h3><p>{{ item.vocabulary }}</p></template>
            </div>
          </article>
        </div>
      </template>
    </main>
    <footer class="wrap footer"><span>문법 300제</span><span>진도와 오답은 이 브라우저에 저장됩니다.</span></footer>
  `,
}).mount('#app')
