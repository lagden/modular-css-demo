<script>
	import Media from './Media.svelte'

	export let title
	export let subtitle
	export let content
	export let image
</script>

<div class="{css.card}">
	<img src="{image}" alt="{title}" class="{css.card_img}">
	<Media {title} {subtitle} {content} />
</div>

<style>@import './Card.sss'</style>
