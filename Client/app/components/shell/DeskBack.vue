<script setup lang="ts">
// Desktop way back above a page or record title, in place of a crumb bar: one 13px muted line, «‹ Главная» for a
// page, «‹ Цели /» for a record on Цели (the slash says the title below is inside it)
withDefaults(defineProps<{ crumbs: { to: string, label: string }[], inside?: boolean }>(), { inside: false })
</script>

<template>
  <nav
    aria-label="Назад"
    class="hidden h-7 min-w-0 items-end gap-1 pb-0.5 text-13 text-toned lg:flex"
  >
    <UIcon
      name="i-lucide-chevron-left"
      class="mb-0.5 size-3.5 shrink-0"
    />
    <template
      v-for="(c, i) in crumbs"
      :key="c.to"
    >
      <span
        v-if="i"
        class="text-dimmed"
      >/</span>
      <NuxtLink
        :to="c.to"
        class="min-w-0 truncate rounded-badge hover:text-highlighted"
      >
        {{ c.label }}
      </NuxtLink>
    </template>
    <span
      v-if="inside"
      class="text-dimmed"
    >/</span>
  </nav>
</template>
