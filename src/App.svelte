<script>
	import products from './fixtures/products.js'
	import Card from './_components/Card.svelte'
</script>

<section class="{css.sample_container}">
	{#each products as product}
		<Card {...product} />
	{/each}
</section>

<style>
@import './_assets/css/mixin.sss'

.sample
	&_container
		padding: 1em
		font-size: 1rem
		font-family: "Helvetica Neue", sans-serif
		width: 100%
		max-width: 1200px
		min-width: 360px
		margin: 0 auto
		box-sizing: border-box
		display: grid
		grid-gap: 1em
		grid-template-columns: 1fr
		@mixin mq $small
			grid-template-columns: 1fr 1fr
		@mixin mq $medium
			grid-template-columns: 1fr 1fr 1fr 1fr
</style>
