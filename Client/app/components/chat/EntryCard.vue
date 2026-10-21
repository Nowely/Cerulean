<script setup lang="ts">
// The card under a journal line, by what happened to it
import type { Entry } from '~/domain/types'
import ReceiptCard from './ReceiptCard.vue'
import QuestionCard from './QuestionCard.vue'
import FoundCard from './FoundCard.vue'
import PendingCard from './PendingCard.vue'

/** `past`: written before today, a receipt is one line until tapped */
defineProps<{ entry: Entry, float?: boolean, past?: boolean }>()
</script>

<template>
  <PendingCard
    v-if="entry.kind === 'pending'"
    :text="entry.text"
    :float="float"
  />
  <QuestionCard
    v-else-if="entry.kind === 'ask'"
    :entry="entry"
    :float="float"
  />
  <FoundCard
    v-else-if="entry.kind === 'found'"
    :entry="entry"
    :float="float"
  />
  <ReceiptCard
    v-else
    :entry="entry"
    :float="float"
    :past="past"
  />
</template>
