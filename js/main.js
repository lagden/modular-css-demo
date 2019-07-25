function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function detach_after(before) {
    while (before.nextSibling) {
        before.parentNode.removeChild(before.nextSibling);
    }
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
}
function update($$) {
    if ($$.fragment) {
        $$.update($$.dirty);
        run_all($$.before_update);
        $$.fragment.p($$.dirty, $$.ctx);
        $$.dirty = null;
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    if (component.$$.fragment) {
        run_all(component.$$.on_destroy);
        component.$$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        component.$$.on_destroy = component.$$.fragment = null;
        component.$$.ctx = {};
    }
}
function make_dirty(component, key) {
    if (!component.$$.dirty) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty = blank_object();
    }
    component.$$.dirty[key] = true;
}
function init(component, options, instance, create_fragment, not_equal, prop_names) {
    const parent_component = current_component;
    set_current_component(component);
    const props = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: prop_names,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty: null
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, props, (key, value) => {
            if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                if ($$.bound[key])
                    $$.bound[key](value);
                if (ready)
                    make_dirty(component, key);
            }
        })
        : props;
    $$.update();
    ready = true;
    run_all($$.before_update);
    $$.fragment = create_fragment($$.ctx);
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
}

const products = [
	{image: 'https://lorempixel.com/400/200/sports/1/', title: 'Title 1', subtitle: 'Subtitle 1', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus in. 1'},
	{image: 'https://lorempixel.com/400/200/sports/2/', title: 'Title 2', subtitle: 'Subtitle 2', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus in. 2'},
	{image: 'https://lorempixel.com/400/200/sports/3/', title: 'Title 3', subtitle: 'Subtitle 3', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus in. 3'},
	{image: 'https://lorempixel.com/400/200/sports/4/', title: 'Title 4', subtitle: 'Subtitle 4', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus in. 4'},
	{image: 'https://lorempixel.com/400/200/sports/5/', title: 'Title 5', subtitle: 'Subtitle 5', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus in. 4'}
];

/* src/_components/Media.svelte generated by Svelte v3.6.7 */

const file = "src/_components/Media.svelte";

function create_fragment(ctx) {
	var div1, img, t0, div0, h2, t1, t2, h5, t3, t4, raw_before;

	return {
		c: function create() {
			div1 = element("div");
			img = element("img");
			t0 = space();
			div0 = element("div");
			h2 = element("h2");
			t1 = text(ctx.title);
			t2 = space();
			h5 = element("h5");
			t3 = text(ctx.subtitle);
			t4 = space();
			raw_before = element('noscript');
			attr(img, "src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAtCAYAAAA6GuKaAAAAO0lEQVR42u3OAQ0AAAgDIN8/9M2hgwRk2s4xkZaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWfp5eqgyGpwz468oAAAAASUVORK5CYII=");
			attr(img, "alt", "title");
			attr(img, "class", "mc6dc1c5d1_media_figure");
			add_location(img, file, 7, 1, 142);
			add_location(h2, file, 9, 2, 416);
			add_location(h5, file, 10, 2, 435);
			attr(div0, "class", "mc6dc1c5d1_media_body");
			add_location(div0, file, 8, 1, 378);
			attr(div1, "class", "mccff070b5_cinza mccff070b5_bb mc6dc1c5d1_media");
			add_location(div1, file, 6, 0, 79);
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			insert(target, div1, anchor);
			append(div1, img);
			append(div1, t0);
			append(div1, div0);
			append(div0, h2);
			append(h2, t1);
			append(div0, t2);
			append(div0, h5);
			append(h5, t3);
			append(div0, t4);
			append(div0, raw_before);
			raw_before.insertAdjacentHTML("afterend", ctx.content);
		},

		p: function update(changed, ctx) {
			if (changed.title) {
				set_data(t1, ctx.title);
			}

			if (changed.subtitle) {
				set_data(t3, ctx.subtitle);
			}

			if (changed.content) {
				detach_after(raw_before);
				raw_before.insertAdjacentHTML("afterend", ctx.content);
			}
		},

		i: noop,
		o: noop,

		d: function destroy(detaching) {
			if (detaching) {
				detach(div1);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { title, subtitle, content } = $$props;

	const writable_props = ['title', 'subtitle', 'content'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Media> was created with unknown prop '${key}'`);
	});

	$$self.$set = $$props => {
		if ('title' in $$props) $$invalidate('title', title = $$props.title);
		if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
		if ('content' in $$props) $$invalidate('content', content = $$props.content);
	};

	return { title, subtitle, content };
}

class Media extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, ["title", "subtitle", "content"]);

		const { ctx } = this.$$;
		const props = options.props || {};
		if (ctx.title === undefined && !('title' in props)) {
			console.warn("<Media> was created without expected prop 'title'");
		}
		if (ctx.subtitle === undefined && !('subtitle' in props)) {
			console.warn("<Media> was created without expected prop 'subtitle'");
		}
		if (ctx.content === undefined && !('content' in props)) {
			console.warn("<Media> was created without expected prop 'content'");
		}
	}

	get title() {
		throw new Error("<Media>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set title(value) {
		throw new Error("<Media>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get subtitle() {
		throw new Error("<Media>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set subtitle(value) {
		throw new Error("<Media>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get content() {
		throw new Error("<Media>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set content(value) {
		throw new Error("<Media>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/_components/Card.svelte generated by Svelte v3.6.7 */

const file$1 = "src/_components/Card.svelte";

function create_fragment$1(ctx) {
	var div, img, t, current;

	var media = new Media({
		props: {
		title: ctx.title,
		subtitle: ctx.subtitle,
		content: ctx.content
	},
		$$inline: true
	});

	return {
		c: function create() {
			div = element("div");
			img = element("img");
			t = space();
			media.$$.fragment.c();
			attr(img, "src", ctx.image);
			attr(img, "alt", ctx.title);
			attr(img, "class", "mcf6e90df2_card_img");
			add_location(img, file$1, 10, 1, 179);
			attr(div, "class", "mccff070b5_bb mcf6e90df2_card");
			add_location(div, file$1, 9, 0, 134);
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			insert(target, div, anchor);
			append(div, img);
			append(div, t);
			mount_component(media, div, null);
			current = true;
		},

		p: function update(changed, ctx) {
			if (!current || changed.image) {
				attr(img, "src", ctx.image);
			}

			if (!current || changed.title) {
				attr(img, "alt", ctx.title);
			}

			var media_changes = {};
			if (changed.title) media_changes.title = ctx.title;
			if (changed.subtitle) media_changes.subtitle = ctx.subtitle;
			if (changed.content) media_changes.content = ctx.content;
			media.$set(media_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(media.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(media.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_component(media, );
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { title, subtitle, content, image } = $$props;

	const writable_props = ['title', 'subtitle', 'content', 'image'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Card> was created with unknown prop '${key}'`);
	});

	$$self.$set = $$props => {
		if ('title' in $$props) $$invalidate('title', title = $$props.title);
		if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
		if ('content' in $$props) $$invalidate('content', content = $$props.content);
		if ('image' in $$props) $$invalidate('image', image = $$props.image);
	};

	return { title, subtitle, content, image };
}

class Card extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["title", "subtitle", "content", "image"]);

		const { ctx } = this.$$;
		const props = options.props || {};
		if (ctx.title === undefined && !('title' in props)) {
			console.warn("<Card> was created without expected prop 'title'");
		}
		if (ctx.subtitle === undefined && !('subtitle' in props)) {
			console.warn("<Card> was created without expected prop 'subtitle'");
		}
		if (ctx.content === undefined && !('content' in props)) {
			console.warn("<Card> was created without expected prop 'content'");
		}
		if (ctx.image === undefined && !('image' in props)) {
			console.warn("<Card> was created without expected prop 'image'");
		}
	}

	get title() {
		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set title(value) {
		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get subtitle() {
		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set subtitle(value) {
		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get content() {
		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set content(value) {
		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get image() {
		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set image(value) {
		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/App.svelte generated by Svelte v3.6.7 */

const file$2 = "src/App.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.product = list[i];
	return child_ctx;
}

// (7:1) {#each products as product}
function create_each_block(ctx) {
	var current;

	var card_spread_levels = [
		ctx.product
	];

	let card_props = {};
	for (var i = 0; i < card_spread_levels.length; i += 1) {
		card_props = assign(card_props, card_spread_levels[i]);
	}
	var card = new Card({ props: card_props, $$inline: true });

	return {
		c: function create() {
			card.$$.fragment.c();
		},

		m: function mount(target, anchor) {
			mount_component(card, target, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			var card_changes = changed.products ? get_spread_update(card_spread_levels, [
				ctx.product
			]) : {};
			card.$set(card_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(card.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(card.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			destroy_component(card, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	var section, current;

	var each_value = products;

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c: function create() {
			section = element("section");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(section, "class", "mc271162f5_sample_container");
			add_location(section, file$2, 5, 0, 113);
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			insert(target, section, anchor);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(section, null);
			}

			current = true;
		},

		p: function update(changed, ctx) {
			if (changed.products) {
				each_value = products;

				for (var i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(section, null);
					}
				}

				group_outros();
				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
				check_outros();
			}
		},

		i: function intro(local) {
			if (current) return;
			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

			current = true;
		},

		o: function outro(local) {
			each_blocks = each_blocks.filter(Boolean);
			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(section);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$2, safe_not_equal, []);
	}
}

const app = new App({
	target: document.body
});

export default app;
//# sourceMappingURL=main.js.map
