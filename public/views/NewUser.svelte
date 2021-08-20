<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
  let username = '';

  function registerUser() {

    localStorage.setItem('blaze', JSON.stringify({
      user: {
        name: username
      },
      rooms: []
    }));

    dispatch('registered');
  }

</script>

<div id="app" class="center-center">

  <form on:submit|preventDefault={registerUser} class="new-user">
    <input
      required
      type="text"
      placeholder="Pon tu nickname"
      maxlength="10"
      aria-label="Pon tu nickname"
      bind:value={username}
    >
    <button type="submit" class="wide">
      Continuar
    </button>
  </form>


</div>