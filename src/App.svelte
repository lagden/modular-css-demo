<script>
	import products from './fixtures/products.js'
	import Card from './_components/Card.svelte'
</script>

<section class="{css.sample_container}">
	{#each products as product}
		<Card {...product} />
	{/each}
</section>

<style>@import './App.sss'</style>
