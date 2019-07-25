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

<style>@import './Media.sss'</style>
