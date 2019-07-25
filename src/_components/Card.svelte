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

<style>
@import '../_assets/css/vars.sss'
@import '../_assets/css/mixin.sss'

@value grayzinho from '../_assets/css/composes.sss'

.card
	// bb from composes
	composes: bb from '../_assets/css/composes.sss'

	background-color: $white_alpha
	border-radius: $radius
	display: flex
	flex-direction: column

	// grayzinho from composes @values
	box-shadow: 0 0 5px 0px grayzinho

	&_img
		display: block
		width: 100%
		height: 100px
		border-radius: $radius $radius 0 0
		object-fit: cover
</style>
