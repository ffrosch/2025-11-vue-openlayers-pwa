<script setup lang="ts">
import { RouterLink } from 'vue-router'
import HelloWorld from '@/components/HelloWorld.vue'
import PWABadge from '@/components/PWABadge.vue'
</script>

<template>
  <div class="flex justify-center">
    <a href="https://vite.dev" target="_blank">
      <img src="/favicon.svg" class="logo" alt="2025-11-vue-openlayers-pwa logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="@/assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="2025-11-vue-openlayers-pwa" />

  <div class="map-link">
    <RouterLink to="/map">View Map</RouterLink>
  </div>

  <PWABadge />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.map-link {
  margin: 2rem 0;
}

.map-link a {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #42b883;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: background 300ms;
}

.map-link a:hover {
  background: #359268;
}
</style>
