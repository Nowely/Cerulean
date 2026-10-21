<script setup lang="ts">
// A template's own page (v24, И9, И7): a record page of its own kind. The stamp (22, `muted`) in the checkbox's slot,
// the title edited in place, «Шаблон для новых записей» under it (no banner), the body edited as on a record, then
// «Подпункты» that are not tickable. No properties, no «Связать», no «Связано»: those belong to the records made by it.
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Page, RecTemplate } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useFreshTail } from '~/composables/useTemplates'
import TitleField from '../common/TitleField.vue'
import BodyField from '../body/BodyField.vue'
import TemplateSub from './TemplateSub.vue'

const props = defineProps<{ tpl: RecTemplate, page: Page }>()
const data = useDataStore()
const ui = useUiStore()

const titleField = useTemplateRef<InstanceType<typeof TitleField>>('titleField')
// «Переименовать» in «⋯»
watch([() => ui.focusTitle, titleField], async ([id, field]) => {
  if (id !== props.tpl.id || !field) return
  ui.focusTitle = null
  await nextTick()
  field.focus()
}, { immediate: true })

const bodyBox = useTemplateRef<HTMLElement>('bodyBox')
const tail = useFreshTail(() => props.tpl.id, bodyBox)
const bodyFocused = ref(false)

const subs = computed(() => props.tpl.subs)
const rows: (InstanceType<typeof TemplateSub> | null)[] = []
const keepRow = (i: number, el: unknown) => {
  rows[i] = el as InstanceType<typeof TemplateSub> | null
}
function save(i: number, text: string) {
  data.updateTemplate(props.tpl.id, { subs: subs.value.map((s, j) => j === i ? text : s) })
}
function remove(i: number) {
  data.updateTemplate(props.tpl.id, { subs: subs.value.filter((_, j) => j !== i) })
}
/** Alt+↑/↓: the subitem, with its edit, one place up or down; the caret goes with it */
async function move(i: number, by: -1 | 1, text: string) {
  const to = i + by
  if (to < 0 || to >= subs.value.length) return
  const list = [...subs.value]
  list[i] = list[to]!
  list[to] = text
  data.updateTemplate(props.tpl.id, { subs: list })
  await nextTick()
  rows[to]?.focus()
}
</script>

<template>
  <div class="pb-4">
    <div
      class="px-4 pt-1 lg:px-0 lg:pt-0.5"
      data-title-block
    >
      <div class="flex items-center gap-2 lg:gap-3">
        <span
          class="-ml-2.5 flex size-11 shrink-0 items-center justify-center text-toned"
          role="img"
          aria-label="Шаблон"
        >
          <UIcon
            name="cer:stamp"
            class="size-5.5"
          />
        </span>
        <TitleField
          ref="titleField"
          :value="tpl.name"
          label="Название шаблона"
          required
          @save="t => data.updateTemplate(tpl.id, { name: t })"
        />
        <span class="hidden shrink-0 lg:block">
          <slot name="menu" />
        </span>
      </div>
      <p class="mt-0.5 text-meta text-toned">
        Шаблон для новых записей
      </p>
    </div>

    <!-- The body, as on a record; the paragraph just sent «В заметку» is tinted fresh -->
    <div
      ref="bodyBox"
      class="body-target relative isolate mx-4 mt-3 mb-1.5 lg:mx-0 lg:mt-5"
    >
      <span
        v-if="tail"
        :key="tail.key"
        class="fresh-tint pointer-events-none absolute -inset-x-1.5 -z-1 rounded-item"
        :style="tail.style"
        aria-hidden="true"
      />
      <BodyField
        :key="tpl.id"
        :owner="{ kind: 'template', id: tpl.id }"
        :doc="tpl.body"
        placeholder="Заметка"
        label="Заметка"
        :context="tpl.name"
        @focus="v => bodyFocused = v"
      />
    </div>

    <section
      class="lg:mt-2"
      aria-labelledby="subs-title"
    >
      <h2
        id="subs-title"
        class="px-4 pt-3 text-cap leading-6 text-toned lg:px-0 lg:pb-1 lg:leading-5"
      >
        Подпункты
      </h2>
      <ul v-if="subs.length">
        <li
          v-for="(s, i) in subs"
          :key="i"
        >
          <TemplateSub
            :ref="el => keepRow(i, el)"
            :text="s"
            @save="t => save(i, t)"
            @remove="remove(i)"
            @move="(by, t) => move(i, by, t)"
          />
        </li>
      </ul>
      <p
        v-else
        class="px-4 pt-1 text-15 leading-[1.5] text-toned lg:mt-0.5 lg:px-0 lg:pt-0 lg:leading-9 lg:text-dimmed"
      >
        {{ bodyFocused ? 'Подпунктов пока нет.' : 'Подпунктов пока нет. Пиши внизу, и они появятся здесь.' }}
      </p>
    </section>
  </div>
</template>
