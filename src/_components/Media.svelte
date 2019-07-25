<script>
	export let title
	export let subtitle
	export let content
</script>

<div class="{css.media}">
	<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAtCAYAAAA6GuKaAAAAO0lEQVR42u3OAQ0AAAgDIN8/9M2hgwRk2s4xkZaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWfp5eqgyGpwz468oAAAAASUVORK5CYII=" alt="title" class="{css.media_figure}">
	<div class="{css.media_body}">
		<h2>{title}</h2>
		<h5>{subtitle}</h5>
		{@html content}
	</div>
</div>

<style>
@import '../_assets/css/vars.sss'
@import '../_assets/css/mixin.sss'

.media
	// cinza and bb from composes
	composes: cinza, bb from '../_assets/css/composes.sss'

	border-radius: 0 0 $radius $radius
	display: flex
	align-items: flex-start
	padding: 1em
	&_figure
		margin-right: 1em
		border-radius: 50%
	&_body
		flex: 1
		h2, h5
			margin: 0 0 5px 0
			padding: 0
</style>
