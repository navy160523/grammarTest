import { computed, ref, watch } from 'vue'

const topics = [
  { name: '명사', cover: 2, end: 6 },
  { name: '인칭대명사', cover: 7, end: 11 },
  { name: '형용사', cover: 12, end: 15 },
  { name: '부사', cover: 16, end: 19 },
  { name: '동사', cover: 20, end: 25 },
  { name: '동명사', cover: 26, end: 30 },
  { name: 'to부정사', cover: 31, end: 36 },
  { name: '분사', cover: 37, end: 42 },
  { name: '명사절', cover: 43, end: 47 },
  { name: '전치사·부사절 접속사', cover: 48, end: 53 },
  { name: '관계대명사', cover: 54, end: 59 },
]

export default {
  setup() {
    const topicIndex = ref(0)
    const page = ref(3)
    const zoom = ref(false)
    const viewport = ref(null)
    const topic = computed(() => topics[topicIndex.value])
    const pages = computed(() => {
      const { cover, end } = topic.value
      const conceptCount = end - cover - 2
      const concepts = Array.from({ length: conceptCount }, (_, index) => ({
        number: cover + index + 1, title: conceptCount === 1 ? '개념' : '개념 ' + (index + 1),
      }))
      return [{ number: cover, title: '주제 표지' }, ...concepts,
        { number: end - 1, title: '문제' }, { number: end, title: '정답' }]
    })
    const selected = computed(() => pages.value.find(item => item.number === page.value))
    const source = computed(() => import.meta.env.BASE_URL + 'grammar-slides/' +
      String(page.value).padStart(2, '0') + '.webp')

    watch(page, () => {
      zoom.value = false
      if (viewport.value) viewport.value.scrollLeft = 0
    })

    function move(step) {
      const next = pages.value.findIndex(item => item.number === page.value) + step
      if (page.value === 1) {
        page.value = pages.value[0].number
      } else if (pages.value[next]) {
        page.value = pages.value[next].number
      }
    }

    return { topics, topicIndex, topic, pages, page, selected, source, viewport, zoom, move }
  },
  template: `
    <section class="guide">
      <div class="guide-header">
        <div><h1>문법 정리</h1><p>김진태 토익 문법 총정리 자료집</p></div>
        <button class="secondary" @click="page = 1">자료 표지</button>
      </div>
      <label class="guide-topic">문법 주제
        <select v-model="topicIndex" @change="page = topics[topicIndex].cover + 1">
          <option v-for="(item, index) in topics" :key="item.cover" :value="index">{{ item.name }}</option>
        </select>
      </label>
      <div class="guide-tabs" role="group" aria-label="자료 페이지">
        <button v-for="item in pages" :key="item.number" class="secondary"
          :aria-pressed="page === item.number" @click="page = item.number">{{ item.title }}</button>
      </div>
      <div class="panel guide-reader">
        <div class="guide-toolbar">
          <span aria-live="polite">{{ selected ? topic.name + ' · ' + selected.title : '자료 표지' }} · {{ page }} / 59</span>
          <button class="secondary" :aria-pressed="zoom" @click="zoom = !zoom">{{ zoom ? '너비 맞춤' : '확대' }}</button>
        </div>
        <div class="guide-viewport" ref="viewport" :class="{zoomed: zoom}" :tabindex="zoom ? 0 : undefined" aria-label="자료 이미지">
          <img :key="page" :src="source" :alt="(selected ? topic.name + ' ' + selected.title : '자료 표지') + ', PDF ' + page + '쪽'" decoding="async">
        </div>
        <div class="guide-toolbar guide-footer">
          <button class="secondary" :disabled="page === 1 || page === pages[0].number" @click="move(-1)">← 이전</button>
          <button class="primary" :disabled="page === pages.at(-1).number" @click="move(1)">다음 →</button>
        </div>
      </div>
    </section>
  `,
}
