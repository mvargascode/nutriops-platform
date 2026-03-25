<template>
  <div class="splash">
    <div class="loader"></div>
    <p>Cargando sistema...</p>
  </div>
</template>

<style scoped>
.splash {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0b1e5b;
  color: white;
  font-size: 18px;
}

.loader {
  width: 50px;
  height: 50px;
  border: 5px solid #ffffff33;
  border-top: 5px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
