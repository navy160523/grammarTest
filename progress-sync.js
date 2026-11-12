import { ref, shallowRef, watch } from 'vue'
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  collection, doc, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, runTransaction, setDoc,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyCrqAx8EXwtuwHBR5wjICpo8VgLlBnjVSg',
  authDomain: 'grammartest-4331c.firebaseapp.com',
  projectId: 'grammartest-4331c',
  storageBucket: 'grammartest-4331c.firebasestorage.app',
  messagingSenderId: '1043931219397',
  appId: '1:1043931219397:web:290e84ad6b5c8f7dfc37ac',
})

const storageKey = 'grammar-300-attempts-v1'
const migrationKey = storageKey + '-imported'
const validChapter = id => /^[0-9]$/.test(id)

function loadGuestRecords() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {}
  } catch {
    return {}
  }
}

async function importGuestRecords(db, path, guestRecords) {
  const imported = localStorage.getItem(migrationKey)
  if (imported) return
  const entries = Object.entries(guestRecords).filter(([id, record]) =>
    validChapter(id) && (record.result || record.cursor || Object.keys(record.draft).length))
  if (!entries.length) return

  await runTransaction(db, async transaction => {
    const documents = await Promise.all(entries.map(([id]) => transaction.get(doc(path, id))))
    documents.forEach((snapshot, index) => {
      if (!snapshot.exists()) transaction.set(snapshot.ref, entries[index][1])
    })
  })
  localStorage.setItem(migrationKey, 'true')
}

export function useProgressSync(onAccountChange) {
  const records = ref(loadGuestRecords())
  const storageError = ref(false)
  const account = shallowRef(null)
  const busy = ref(true)
  const ready = ref(true)
  const status = ref('')
  let path
  let stopListening
  let auth

  watch(records, value => {
    if (path) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
      storageError.value = false
    } catch {
      storageError.value = true
    }
  }, { deep: true, flush: 'sync' })

  if (location.protocol === 'file:') {
    busy.value = false
  } else {
    auth = getAuth(app)
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })

    onAuthStateChanged(auth, user => {
      const accountChanged = account.value?.uid !== user?.uid
      busy.value = false
      if (!accountChanged) return
      stopListening?.()
      account.value = user
      status.value = ''
      path = user ? collection(db, 'users', user.uid, 'grammarProgress') : null
      ready.value = !user
      records.value = user ? {} : loadGuestRecords()
      onAccountChange()
      if (!user) return

      const activePath = path
      let checkedMigration = false
      let importing = false
      stopListening = onSnapshot(activePath, { includeMetadataChanges: true }, async snapshot => {
        if (path !== activePath) return
        records.value = Object.fromEntries(snapshot.docs.filter(item => validChapter(item.id))
          .map(item => [item.id, item.data()]))
        if (!snapshot.metadata.fromCache && !checkedMigration) {
          checkedMigration = true
          importing = true
          ready.value = false
          status.value = '기존 풀이 기록을 확인하는 중입니다.'
          try {
            await importGuestRecords(db, activePath, loadGuestRecords())
          } catch {
            if (path === activePath) status.value = '기존 기록을 옮기지 못했습니다. 이 브라우저의 기록은 보관되어 있습니다.'
            return
          } finally {
            importing = false
            if (path === activePath) ready.value = true
          }
          if (path !== activePath) return
        }
        if (importing) return
        ready.value = !snapshot.metadata.fromCache || snapshot.size > 0
        status.value = snapshot.metadata.hasPendingWrites ? '동기화 대기 중'
          : snapshot.metadata.fromCache ? (ready.value ? '이 기기에 저장된 기록을 보고 있습니다.' : '계정 기록을 불러오는 중입니다.')
            : '계정 기록 동기화됨'
      }, () => {
        if (path !== activePath) return
        ready.value = false
        status.value = '계정 기록에 연결할 수 없습니다. Firestore 설정을 확인해 주세요.'
      })
    })
  }

  async function toggleAccount() {
    if (!auth) return
    busy.value = true
    status.value = ''
    try {
      if (account.value) await signOut(auth)
      else await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (error) {
      status.value = error.code === 'auth/unauthorized-domain'
        ? 'Firebase Authentication에 이 사이트 주소를 등록해 주세요.'
        : error.code === 'auth/operation-not-allowed'
          ? 'Firebase Authentication에서 Google 로그인을 활성화해 주세요.'
          : 'Google 로그인 상태를 변경하지 못했습니다. 다시 시도해 주세요.'
    } finally {
      busy.value = false
    }
  }

  function saveChapter(index, record) {
    if (!path) return
    const activePath = path
    const data = { ...record, draft: { ...record.draft } }
    if (record.result) data.result = { ...record.result, answers: { ...record.result.answers } }
    setDoc(doc(activePath, String(index)), data).catch(() => {
      if (path === activePath) status.value = '풀이 기록을 계정에 저장하지 못했습니다.'
    })
  }

  return { records, storageError, account, busy, ready, status, canSignIn: !!auth, toggleAccount, saveChapter }
}
