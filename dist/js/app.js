var app = function () {
  'use strict';

  function noop() {}

  const identity = x => x;

  function assign(tar, src) {
    // @ts-ignore
    for (const k in src) tar[k] = src[k];

    return tar;
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
    return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
  }

  function is_empty(obj) {
    return Object.keys(obj).length === 0;
  }

  function subscribe(store, ...callbacks) {
    if (store == null) {
      return noop;
    }

    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
  }

  function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
  }

  function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
      const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
      return definition[0](slot_ctx);
    }
  }

  function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
  }

  function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
      const lets = definition[2](fn(dirty));

      if ($$scope.dirty === undefined) {
        return lets;
      }

      if (typeof lets === 'object') {
        const merged = [];
        const len = Math.max($$scope.dirty.length, lets.length);

        for (let i = 0; i < len; i += 1) {
          merged[i] = $$scope.dirty[i] | lets[i];
        }

        return merged;
      }

      return $$scope.dirty | lets;
    }

    return $$scope.dirty;
  }

  function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
      const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
      slot.p(slot_context, slot_changes);
    }
  }

  function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
      const dirty = [];
      const length = $$scope.ctx.length / 32;

      for (let i = 0; i < length; i++) {
        dirty[i] = -1;
      }

      return dirty;
    }

    return -1;
  }

  function exclude_internal_props(props) {
    const result = {};

    for (const k in props) if (k[0] !== '$') result[k] = props[k];

    return result;
  }

  const is_client = typeof window !== 'undefined';
  let now = is_client ? () => window.performance.now() : () => Date.now();
  let raf = is_client ? cb => requestAnimationFrame(cb) : noop;
  const tasks = new Set();

  function run_tasks(now) {
    tasks.forEach(task => {
      if (!task.c(now)) {
        tasks.delete(task);
        task.f();
      }
    });
    if (tasks.size !== 0) raf(run_tasks);
  }
  /**
   * Creates a new task that runs on each raf frame
   * until it returns a falsy value or is aborted
   */


  function loop(callback) {
    let task;
    if (tasks.size === 0) raf(run_tasks);
    return {
      promise: new Promise(fulfill => {
        tasks.add(task = {
          c: callback,
          f: fulfill
        });
      }),

      abort() {
        tasks.delete(task);
      }

    };
  }

  function append(target, node) {
    target.appendChild(node);
  }

  function get_root_for_style(node) {
    if (!node) return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;

    if (root.host) {
      return root;
    }

    return document;
  }

  function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element;
  }

  function append_stylesheet(node, style) {
    append(node.head || node, style);
  }

  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }

  function detach(node) {
    node.parentNode.removeChild(node);
  }

  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }

  function element(name) {
    return document.createElement(name);
  }

  function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function text(data) {
    return document.createTextNode(data);
  }

  function space() {
    return text(' ');
  }

  function empty() {
    return text('');
  }

  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
  }

  function prevent_default(fn) {
    return function (event) {
      event.preventDefault(); // @ts-ignore

      return fn.call(this, event);
    };
  }

  function stop_propagation(fn) {
    return function (event) {
      event.stopPropagation(); // @ts-ignore

      return fn.call(this, event);
    };
  }

  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }

  function children(element) {
    return Array.from(element.childNodes);
  }

  function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data) text.data = data;
  }

  function set_input_value(input, value) {
    input.value = value == null ? '' : value;
  }

  function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
  }

  function custom_event(type, detail, bubbles = false) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, false, detail);
    return e;
  }

  const active_docs = new Set();
  let active = 0; // https://github.com/darkskyapp/string-hash/blob/master/index.js

  function hash(str) {
    let hash = 5381;
    let i = str.length;

    while (i--) hash = (hash << 5) - hash ^ str.charCodeAt(i);

    return hash >>> 0;
  }

  function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';

    for (let p = 0; p <= 1; p += step) {
      const t = a + (b - a) * ease(p);
      keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }

    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    active_docs.add(doc);
    const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = append_empty_stylesheet(node).sheet);
    const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});

    if (!current_rules[name]) {
      current_rules[name] = true;
      stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }

    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
  }

  function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name ? anim => anim.indexOf(name) < 0 // remove specific animation
    : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;

    if (deleted) {
      node.style.animation = next.join(', ');
      active -= deleted;
      if (!active) clear_rules();
    }
  }

  function clear_rules() {
    raf(() => {
      if (active) return;
      active_docs.forEach(doc => {
        const stylesheet = doc.__svelte_stylesheet;
        let i = stylesheet.cssRules.length;

        while (i--) stylesheet.deleteRule(i);

        doc.__svelte_rules = {};
      });
      active_docs.clear();
    });
  }

  let current_component;

  function set_current_component(component) {
    current_component = component;
  }

  function get_current_component() {
    if (!current_component) throw new Error('Function called outside component initialization');
    return current_component;
  }

  function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
  }

  function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
  }

  function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
      const callbacks = component.$$.callbacks[type];

      if (callbacks) {
        // TODO are there situations where events could be dispatched
        // in a server (non-DOM) environment?
        const event = custom_event(type, detail);
        callbacks.slice().forEach(fn => {
          fn.call(component, event);
        });
      }
    };
  }

  function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
  }

  function getContext(key) {
    return get_current_component().$$.context.get(key);
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

  let flushing = false;
  const seen_callbacks = new Set();

  function flush() {
    if (flushing) return;
    flushing = true;

    do {
      // first, call beforeUpdate functions
      // and update components
      for (let i = 0; i < dirty_components.length; i += 1) {
        const component = dirty_components[i];
        set_current_component(component);
        update(component.$$);
      }

      set_current_component(null);
      dirty_components.length = 0;

      while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...


      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];

        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }

      render_callbacks.length = 0;
    } while (dirty_components.length);

    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }

    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
  }

  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }

  let promise;

  function wait() {
    if (!promise) {
      promise = Promise.resolve();
      promise.then(() => {
        promise = null;
      });
    }

    return promise;
  }

  function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(() => {
        outroing.delete(block);

        if (callback) {
          if (detach) block.d(1);
          callback();
        }
      });
      block.o(local);
    }
  }

  const null_transition = {
    duration: 0
  };

  function create_bidirectional_transition(node, fn, params, intro) {
    let config = fn(node, params);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;

    function clear_animation() {
      if (animation_name) delete_rule(node, animation_name);
    }

    function init(program, duration) {
      const d = program.b - t;
      duration *= Math.abs(d);
      return {
        a: t,
        b: program.b,
        d,
        duration,
        start: program.start,
        end: program.start + duration,
        group: program.group
      };
    }

    function go(b) {
      const {
        delay = 0,
        duration = 300,
        easing = identity,
        tick = noop,
        css
      } = config || null_transition;
      const program = {
        start: now() + delay,
        b
      };

      if (!b) {
        // @ts-ignore todo: improve typings
        program.group = outros;
        outros.r += 1;
      }

      if (running_program || pending_program) {
        pending_program = program;
      } else {
        // if this is an intro, and there's a delay, we need to do
        // an initial tick and/or apply CSS animation immediately
        if (css) {
          clear_animation();
          animation_name = create_rule(node, t, b, duration, delay, easing, css);
        }

        if (b) tick(0, 1);
        running_program = init(program, duration);
        add_render_callback(() => dispatch(node, b, 'start'));
        loop(now => {
          if (pending_program && now > pending_program.start) {
            running_program = init(pending_program, duration);
            pending_program = null;
            dispatch(node, running_program.b, 'start');

            if (css) {
              clear_animation();
              animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
            }
          }

          if (running_program) {
            if (now >= running_program.end) {
              tick(t = running_program.b, 1 - t);
              dispatch(node, running_program.b, 'end');

              if (!pending_program) {
                // we're done
                if (running_program.b) {
                  // intro — we can tidy up immediately
                  clear_animation();
                } else {
                  // outro — needs to be coordinated
                  if (! --running_program.group.r) run_all(running_program.group.c);
                }
              }

              running_program = null;
            } else if (now >= running_program.start) {
              const p = now - running_program.start;
              t = running_program.a + running_program.d * easing(p / running_program.duration);
              tick(t, 1 - t);
            }
          }

          return !!(running_program || pending_program);
        });
      }
    }

    return {
      run(b) {
        if (is_function(config)) {
          wait().then(() => {
            // @ts-ignore
            config = config();
            go(b);
          });
        } else {
          go(b);
        }
      },

      end() {
        clear_animation();
        running_program = pending_program = null;
      }

    };
  }

  const globals = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : global;

  function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = {
      $$scope: 1
    };
    let i = levels.length;

    while (i--) {
      const o = levels[i];
      const n = updates[i];

      if (n) {
        for (const key in o) {
          if (!(key in n)) to_null_out[key] = 1;
        }

        for (const key in n) {
          if (!accounted_for[key]) {
            update[key] = n[key];
            accounted_for[key] = 1;
          }
        }

        levels[i] = n;
      } else {
        for (const key in o) {
          accounted_for[key] = 1;
        }
      }
    }

    for (const key in to_null_out) {
      if (!(key in update)) update[key] = undefined;
    }

    return update;
  }

  function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
  }

  function create_component(block) {
    block && block.c();
  }

  function mount_component(component, target, anchor, customElement) {
    const {
      fragment,
      on_mount,
      on_destroy,
      after_update
    } = component.$$;
    fragment && fragment.m(target, anchor);

    if (!customElement) {
      // onMount happens before the initial afterUpdate
      add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
    }

    after_update.forEach(add_render_callback);
  }

  function destroy_component(component, detaching) {
    const $$ = component.$$;

    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)

      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }

  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }

    component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
  }

  function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(parent_component ? parent_component.$$.context : options.context || []),
      // everything else
      callbacks: blank_object(),
      dirty,
      skip_bound: false,
      root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance ? instance(component, options.props || {}, (i, ret, ...rest) => {
      const value = rest.length ? rest[0] : ret;

      if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
        if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
        if (ready) make_dirty(component, i);
      }

      return ret;
    }) : [];
    $$.update();
    ready = true;
    run_all($$.before_update); // `false` as a special case of no DOM component

    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

    if (options.target) {
      if (options.hydrate) {
        const nodes = children(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }

      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor, options.customElement);
      flush();
    }

    set_current_component(parent_component);
  }
  /**
   * Base class for Svelte components. Used when dev=false.
   */


  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }

    $on(type, callback) {
      const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }

    $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    }

  }

  const subscriber_queue = [];
  /**
   * Creates a `Readable` store that allows reading by subscription.
   * @param value initial value
   * @param {StartStopNotifier}start start and stop notifications for subscriptions
   */

  function readable(value, start) {
    return {
      subscribe: writable(value, start).subscribe
    };
  }
  /**
   * Create a `Writable` store that allows both updating and reading by subscription.
   * @param {*=}value initial value
   * @param {StartStopNotifier=}start start and stop notifications for subscriptions
   */


  function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();

    function set(new_value) {
      if (safe_not_equal(value, new_value)) {
        value = new_value;

        if (stop) {
          // store is ready
          const run_queue = !subscriber_queue.length;

          for (const subscriber of subscribers) {
            subscriber[1]();
            subscriber_queue.push(subscriber, value);
          }

          if (run_queue) {
            for (let i = 0; i < subscriber_queue.length; i += 2) {
              subscriber_queue[i][0](subscriber_queue[i + 1]);
            }

            subscriber_queue.length = 0;
          }
        }
      }
    }

    function update(fn) {
      set(fn(value));
    }

    function subscribe(run, invalidate = noop) {
      const subscriber = [run, invalidate];
      subscribers.add(subscriber);

      if (subscribers.size === 1) {
        stop = start(set) || noop;
      }

      run(value);
      return () => {
        subscribers.delete(subscriber);

        if (subscribers.size === 0) {
          stop();
          stop = null;
        }
      };
    }

    return {
      set,
      update,
      subscribe
    };
  }

  function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single ? [stores] : stores;
    const auto = fn.length < 2;
    return readable(initial_value, set => {
      let inited = false;
      const values = [];
      let pending = 0;
      let cleanup = noop;

      const sync = () => {
        if (pending) {
          return;
        }

        cleanup();
        const result = fn(single ? values[0] : values, set);

        if (auto) {
          set(result);
        } else {
          cleanup = is_function(result) ? result : noop;
        }
      };

      const unsubscribers = stores_array.map((store, i) => subscribe(store, value => {
        values[i] = value;
        pending &= ~(1 << i);

        if (inited) {
          sync();
        }
      }, () => {
        pending |= 1 << i;
      }));
      inited = true;
      sync();
      return function stop() {
        run_all(unsubscribers);
        cleanup();
      };
    });
  }

  const LOCATION = {};
  const ROUTER = {};
  /**
   * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
   *
   * https://github.com/reach/router/blob/master/LICENSE
   * */

  function getLocation(source) {
    return { ...source.location,
      state: source.history.state,
      key: source.history.state && source.history.state.key || "initial"
    };
  }

  function createHistory(source, options) {
    const listeners = [];
    let location = getLocation(source);
    return {
      get location() {
        return location;
      },

      listen(listener) {
        listeners.push(listener);

        const popstateListener = () => {
          location = getLocation(source);
          listener({
            location,
            action: "POP"
          });
        };

        source.addEventListener("popstate", popstateListener);
        return () => {
          source.removeEventListener("popstate", popstateListener);
          const index = listeners.indexOf(listener);
          listeners.splice(index, 1);
        };
      },

      navigate(to, {
        state,
        replace = false
      } = {}) {
        state = { ...state,
          key: Date.now() + ""
        }; // try...catch iOS Safari limits to 100 pushState calls

        try {
          if (replace) {
            source.history.replaceState(state, null, to);
          } else {
            source.history.pushState(state, null, to);
          }
        } catch (e) {
          source.location[replace ? "replace" : "assign"](to);
        }

        location = getLocation(source);
        listeners.forEach(listener => listener({
          location,
          action: "PUSH"
        }));
      }

    };
  } // Stores history entries in memory for testing or other platforms like Native


  function createMemorySource(initialPathname = "/") {
    let index = 0;
    const stack = [{
      pathname: initialPathname,
      search: ""
    }];
    const states = [];
    return {
      get location() {
        return stack[index];
      },

      addEventListener(name, fn) {},

      removeEventListener(name, fn) {},

      history: {
        get entries() {
          return stack;
        },

        get index() {
          return index;
        },

        get state() {
          return states[index];
        },

        pushState(state, _, uri) {
          const [pathname, search = ""] = uri.split("?");
          index++;
          stack.push({
            pathname,
            search
          });
          states.push(state);
        },

        replaceState(state, _, uri) {
          const [pathname, search = ""] = uri.split("?");
          stack[index] = {
            pathname,
            search
          };
          states[index] = state;
        }

      }
    };
  } // Global history uses window.history as the source if available,
  // otherwise a memory history


  const canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
  const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
  const {
    navigate
  } = globalHistory;
  /**
   * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
   *
   * https://github.com/reach/router/blob/master/LICENSE
   * */

  const paramRe = /^:(.+)/;
  const SEGMENT_POINTS = 4;
  const STATIC_POINTS = 3;
  const DYNAMIC_POINTS = 2;
  const SPLAT_PENALTY = 1;
  const ROOT_POINTS = 1;
  /**
   * Check if `segment` is a root segment
   * @param {string} segment
   * @return {boolean}
   */

  function isRootSegment(segment) {
    return segment === "";
  }
  /**
   * Check if `segment` is a dynamic segment
   * @param {string} segment
   * @return {boolean}
   */


  function isDynamic(segment) {
    return paramRe.test(segment);
  }
  /**
   * Check if `segment` is a splat
   * @param {string} segment
   * @return {boolean}
   */


  function isSplat(segment) {
    return segment[0] === "*";
  }
  /**
   * Split up the URI into segments delimited by `/`
   * @param {string} uri
   * @return {string[]}
   */


  function segmentize(uri) {
    return uri // Strip starting/ending `/`
    .replace(/(^\/+|\/+$)/g, "").split("/");
  }
  /**
   * Strip `str` of potential start and end `/`
   * @param {string} str
   * @return {string}
   */


  function stripSlashes(str) {
    return str.replace(/(^\/+|\/+$)/g, "");
  }
  /**
   * Score a route depending on how its individual segments look
   * @param {object} route
   * @param {number} index
   * @return {object}
   */


  function rankRoute(route, index) {
    const score = route.default ? 0 : segmentize(route.path).reduce((score, segment) => {
      score += SEGMENT_POINTS;

      if (isRootSegment(segment)) {
        score += ROOT_POINTS;
      } else if (isDynamic(segment)) {
        score += DYNAMIC_POINTS;
      } else if (isSplat(segment)) {
        score -= SEGMENT_POINTS + SPLAT_PENALTY;
      } else {
        score += STATIC_POINTS;
      }

      return score;
    }, 0);
    return {
      route,
      score,
      index
    };
  }
  /**
   * Give a score to all routes and sort them on that
   * @param {object[]} routes
   * @return {object[]}
   */


  function rankRoutes(routes) {
    return routes.map(rankRoute) // If two routes have the exact same score, we go by index instead
    .sort((a, b) => a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index);
  }
  /**
   * Ranks and picks the best route to match. Each segment gets the highest
   * amount of points, then the type of segment gets an additional amount of
   * points where
   *
   *  static > dynamic > splat > root
   *
   * This way we don't have to worry about the order of our routes, let the
   * computers do it.
   *
   * A route looks like this
   *
   *  { path, default, value }
   *
   * And a returned match looks like:
   *
   *  { route, params, uri }
   *
   * @param {object[]} routes
   * @param {string} uri
   * @return {?object}
   */


  function pick(routes, uri) {
    let match;
    let default_;
    const [uriPathname] = uri.split("?");
    const uriSegments = segmentize(uriPathname);
    const isRootUri = uriSegments[0] === "";
    const ranked = rankRoutes(routes);

    for (let i = 0, l = ranked.length; i < l; i++) {
      const route = ranked[i].route;
      let missed = false;

      if (route.default) {
        default_ = {
          route,
          params: {},
          uri
        };
        continue;
      }

      const routeSegments = segmentize(route.path);
      const params = {};
      const max = Math.max(uriSegments.length, routeSegments.length);
      let index = 0;

      for (; index < max; index++) {
        const routeSegment = routeSegments[index];
        const uriSegment = uriSegments[index];

        if (routeSegment !== undefined && isSplat(routeSegment)) {
          // Hit a splat, just grab the rest, and return a match
          // uri:   /files/documents/work
          // route: /files/* or /files/*splatname
          const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);
          params[splatName] = uriSegments.slice(index).map(decodeURIComponent).join("/");
          break;
        }

        if (uriSegment === undefined) {
          // URI is shorter than the route, no match
          // uri:   /users
          // route: /users/:userId
          missed = true;
          break;
        }

        let dynamicMatch = paramRe.exec(routeSegment);

        if (dynamicMatch && !isRootUri) {
          const value = decodeURIComponent(uriSegment);
          params[dynamicMatch[1]] = value;
        } else if (routeSegment !== uriSegment) {
          // Current segments don't match, not dynamic, not splat, so no match
          // uri:   /users/123/settings
          // route: /users/:id/profile
          missed = true;
          break;
        }
      }

      if (!missed) {
        match = {
          route,
          params,
          uri: "/" + uriSegments.slice(0, index).join("/")
        };
        break;
      }
    }

    return match || default_ || null;
  }
  /**
   * Check if the `path` matches the `uri`.
   * @param {string} path
   * @param {string} uri
   * @return {?object}
   */


  function match(route, uri) {
    return pick([route], uri);
  }
  /**
   * Combines the `basepath` and the `path` into one path.
   * @param {string} basepath
   * @param {string} path
   */


  function combinePaths(basepath, path) {
    return `${stripSlashes(path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`)}/`;
  }
  /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.42.1 */


  function create_fragment(ctx) {
    let current;
    const default_slot_template =
    /*#slots*/
    ctx[9].default;
    const default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[8], null);
    return {
      c() {
        if (default_slot) default_slot.c();
      },

      m(target, anchor) {
        if (default_slot) {
          default_slot.m(target, anchor);
        }

        current = true;
      },

      p(ctx, [dirty]) {
        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope*/
          256)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[8], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[8]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[8], dirty, null), null);
          }
        }
      },

      i(local) {
        if (current) return;
        transition_in(default_slot, local);
        current = true;
      },

      o(local) {
        transition_out(default_slot, local);
        current = false;
      },

      d(detaching) {
        if (default_slot) default_slot.d(detaching);
      }

    };
  }

  function instance($$self, $$props, $$invalidate) {
    let $location;
    let $routes;
    let $base;
    let {
      $$slots: slots = {},
      $$scope
    } = $$props;
    let {
      basepath = "/"
    } = $$props;
    let {
      url = null
    } = $$props;
    const locationContext = getContext(LOCATION);
    const routerContext = getContext(ROUTER);
    const routes = writable([]);
    component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    const activeRoute = writable(null);
    let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.
    // If locationContext is not set, this is the topmost Router in the tree.
    // If the `url` prop is given we force the location to it.

    const location = locationContext || writable(url ? {
      pathname: url
    } : globalHistory.location);
    component_subscribe($$self, location, value => $$invalidate(5, $location = value)); // If routerContext is set, the routerBase of the parent Router
    // will be the base for this Router's descendants.
    // If routerContext is not set, the path and resolved uri will both
    // have the value of the basepath prop.

    const base = routerContext ? routerContext.routerBase : writable({
      path: basepath,
      uri: basepath
    });
    component_subscribe($$self, base, value => $$invalidate(7, $base = value));
    const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
      // If there is no activeRoute, the routerBase will be identical to the base.
      if (activeRoute === null) {
        return base;
      }

      const {
        path: basepath
      } = base;
      const {
        route,
        uri
      } = activeRoute; // Remove the potential /* or /*splatname from
      // the end of the child Routes relative paths.

      const path = route.default ? basepath : route.path.replace(/\*.*$/, "");
      return {
        path,
        uri
      };
    });

    function registerRoute(route) {
      const {
        path: basepath
      } = $base;
      let {
        path
      } = route; // We store the original path in the _path property so we can reuse
      // it when the basepath changes. The only thing that matters is that
      // the route reference is intact, so mutation is fine.

      route._path = path;
      route.path = combinePaths(basepath, path);

      if (typeof window === "undefined") {
        // In SSR we should set the activeRoute immediately if it is a match.
        // If there are more Routes being registered after a match is found,
        // we just skip them.
        if (hasActiveRoute) {
          return;
        }

        const matchingRoute = match(route, $location.pathname);

        if (matchingRoute) {
          activeRoute.set(matchingRoute);
          hasActiveRoute = true;
        }
      } else {
        routes.update(rs => {
          rs.push(route);
          return rs;
        });
      }
    }

    function unregisterRoute(route) {
      routes.update(rs => {
        const index = rs.indexOf(route);
        rs.splice(index, 1);
        return rs;
      });
    }

    if (!locationContext) {
      // The topmost Router in the tree is responsible for updating
      // the location store and supplying it through context.
      onMount(() => {
        const unlisten = globalHistory.listen(history => {
          location.set(history.location);
        });
        return unlisten;
      });
      setContext(LOCATION, location);
    }

    setContext(ROUTER, {
      activeRoute,
      base,
      routerBase,
      registerRoute,
      unregisterRoute
    });

    $$self.$$set = $$props => {
      if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
      if ('url' in $$props) $$invalidate(4, url = $$props.url);
      if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    };

    $$self.$$.update = () => {
      if ($$self.$$.dirty &
      /*$base*/
      128) {
        // This reactive statement will update all the Routes' path when
        // the basepath changes.
        {
          const {
            path: basepath
          } = $base;
          routes.update(rs => {
            rs.forEach(r => r.path = combinePaths(basepath, r._path));
            return rs;
          });
        }
      }

      if ($$self.$$.dirty &
      /*$routes, $location*/
      96) {
        // This reactive statement will be run when the Router is created
        // when there are no Routes and then again the following tick, so it
        // will not find an active Route in SSR and in the browser it will only
        // pick an active Route after all Routes have been registered.
        {
          const bestMatch = pick($routes, $location.pathname);
          activeRoute.set(bestMatch);
        }
      }
    };

    return [routes, location, base, basepath, url, $location, $routes, $base, $$scope, slots];
  }

  class Router extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance, create_fragment, safe_not_equal, {
        basepath: 3,
        url: 4
      });
    }

  }
  /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.42.1 */


  const get_default_slot_changes = dirty => ({
    params: dirty &
    /*routeParams*/
    4,
    location: dirty &
    /*$location*/
    16
  });

  const get_default_slot_context = ctx => ({
    params:
    /*routeParams*/
    ctx[2],
    location:
    /*$location*/
    ctx[4]
  }); // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}


  function create_if_block(ctx) {
    let current_block_type_index;
    let if_block;
    let if_block_anchor;
    let current;
    const if_block_creators = [create_if_block_1, create_else_block];
    const if_blocks = [];

    function select_block_type(ctx, dirty) {
      if (
      /*component*/
      ctx[0] !== null) return 0;
      return 1;
    }

    current_block_type_index = select_block_type(ctx);
    if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    return {
      c() {
        if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if_blocks[current_block_type_index].m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },

      p(ctx, dirty) {
        let previous_block_index = current_block_type_index;
        current_block_type_index = select_block_type(ctx);

        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(ctx, dirty);
        } else {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
          if_block = if_blocks[current_block_type_index];

          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
            if_block.c();
          } else {
            if_block.p(ctx, dirty);
          }

          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if_blocks[current_block_type_index].d(detaching);
        if (detaching) detach(if_block_anchor);
      }

    };
  } // (43:2) {:else}


  function create_else_block(ctx) {
    let current;
    const default_slot_template =
    /*#slots*/
    ctx[10].default;
    const default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[9], get_default_slot_context);
    return {
      c() {
        if (default_slot) default_slot.c();
      },

      m(target, anchor) {
        if (default_slot) {
          default_slot.m(target, anchor);
        }

        current = true;
      },

      p(ctx, dirty) {
        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope, routeParams, $location*/
          532)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[9], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[9]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[9], dirty, get_default_slot_changes), get_default_slot_context);
          }
        }
      },

      i(local) {
        if (current) return;
        transition_in(default_slot, local);
        current = true;
      },

      o(local) {
        transition_out(default_slot, local);
        current = false;
      },

      d(detaching) {
        if (default_slot) default_slot.d(detaching);
      }

    };
  } // (41:2) {#if component !== null}


  function create_if_block_1(ctx) {
    let switch_instance;
    let switch_instance_anchor;
    let current;
    const switch_instance_spread_levels = [{
      location:
      /*$location*/
      ctx[4]
    },
    /*routeParams*/
    ctx[2],
    /*routeProps*/
    ctx[3]];
    var switch_value =
    /*component*/
    ctx[0];

    function switch_props(ctx) {
      let switch_instance_props = {};

      for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
        switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
      }

      return {
        props: switch_instance_props
      };
    }

    if (switch_value) {
      switch_instance = new switch_value(switch_props());
    }

    return {
      c() {
        if (switch_instance) create_component(switch_instance.$$.fragment);
        switch_instance_anchor = empty();
      },

      m(target, anchor) {
        if (switch_instance) {
          mount_component(switch_instance, target, anchor);
        }

        insert(target, switch_instance_anchor, anchor);
        current = true;
      },

      p(ctx, dirty) {
        const switch_instance_changes = dirty &
        /*$location, routeParams, routeProps*/
        28 ? get_spread_update(switch_instance_spread_levels, [dirty &
        /*$location*/
        16 && {
          location:
          /*$location*/
          ctx[4]
        }, dirty &
        /*routeParams*/
        4 && get_spread_object(
        /*routeParams*/
        ctx[2]), dirty &
        /*routeProps*/
        8 && get_spread_object(
        /*routeProps*/
        ctx[3])]) : {};

        if (switch_value !== (switch_value =
        /*component*/
        ctx[0])) {
          if (switch_instance) {
            group_outros();
            const old_component = switch_instance;
            transition_out(old_component.$$.fragment, 1, 0, () => {
              destroy_component(old_component, 1);
            });
            check_outros();
          }

          if (switch_value) {
            switch_instance = new switch_value(switch_props());
            create_component(switch_instance.$$.fragment);
            transition_in(switch_instance.$$.fragment, 1);
            mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
          } else {
            switch_instance = null;
          }
        } else if (switch_value) {
          switch_instance.$set(switch_instance_changes);
        }
      },

      i(local) {
        if (current) return;
        if (switch_instance) transition_in(switch_instance.$$.fragment, local);
        current = true;
      },

      o(local) {
        if (switch_instance) transition_out(switch_instance.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(switch_instance_anchor);
        if (switch_instance) destroy_component(switch_instance, detaching);
      }

    };
  }

  function create_fragment$1(ctx) {
    let if_block_anchor;
    let current;
    let if_block =
    /*$activeRoute*/
    ctx[1] !== null &&
    /*$activeRoute*/
    ctx[1].route ===
    /*route*/
    ctx[7] && create_if_block(ctx);
    return {
      c() {
        if (if_block) if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },

      p(ctx, [dirty]) {
        if (
        /*$activeRoute*/
        ctx[1] !== null &&
        /*$activeRoute*/
        ctx[1].route ===
        /*route*/
        ctx[7]) {
          if (if_block) {
            if_block.p(ctx, dirty);

            if (dirty &
            /*$activeRoute*/
            2) {
              transition_in(if_block, 1);
            }
          } else {
            if_block = create_if_block(ctx);
            if_block.c();
            transition_in(if_block, 1);
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        } else if (if_block) {
          group_outros();
          transition_out(if_block, 1, 1, () => {
            if_block = null;
          });
          check_outros();
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if (if_block) if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
      }

    };
  }

  function instance$1($$self, $$props, $$invalidate) {
    let $activeRoute;
    let $location;
    let {
      $$slots: slots = {},
      $$scope
    } = $$props;
    let {
      path = ""
    } = $$props;
    let {
      component = null
    } = $$props;
    const {
      registerRoute,
      unregisterRoute,
      activeRoute
    } = getContext(ROUTER);
    component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    const location = getContext(LOCATION);
    component_subscribe($$self, location, value => $$invalidate(4, $location = value));
    const route = {
      path,
      // If no path prop is given, this Route will act as the default Route
      // that is rendered if no other Route in the Router is a match.
      default: path === ""
    };
    let routeParams = {};
    let routeProps = {};
    registerRoute(route); // There is no need to unregister Routes in SSR since it will all be
    // thrown away anyway.

    if (typeof window !== "undefined") {
      onDestroy(() => {
        unregisterRoute(route);
      });
    }

    $$self.$$set = $$new_props => {
      $$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
      if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
      if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
      if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    };

    $$self.$$.update = () => {
      if ($$self.$$.dirty &
      /*$activeRoute*/
      2) {
        if ($activeRoute && $activeRoute.route === route) {
          $$invalidate(2, routeParams = $activeRoute.params);
        }
      }

      {
        const {
          path,
          component,
          ...rest
        } = $$props;
        $$invalidate(3, routeProps = rest);
      }
    };

    $$props = exclude_internal_props($$props);
    return [component, $activeRoute, routeParams, routeProps, $location, activeRoute, location, route, path, $$scope, slots];
  }

  class Route extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$1, create_fragment$1, safe_not_equal, {
        path: 8,
        component: 0
      });
    }

  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
    return module = {
      exports: {}
    }, fn(module, module.exports), module.exports;
  }

  var download = createCommonjsModule(function (module, exports) {
    //download.js v4.2, by dandavis; 2008-2016. [MIT] see http://danml.com/download.html for tests/usage
    // v1 landed a FF+Chrome compat way of downloading strings to local un-named files, upgraded to use a hidden frame and optional mime
    // v2 added named files via a[download], msSaveBlob, IE (10+) support, and window.URL support for larger+faster saves than dataURLs
    // v3 added dataURL and Blob Input, bind-toggle arity, and legacy dataURL fallback was improved with force-download mime and base64 support. 3.1 improved safari handling.
    // v4 adds AMD/UMD, commonJS, and plain browser support
    // v4.1 adds url download capability via solo URL argument (same domain/CORS only)
    // v4.2 adds semantic variable names, long (over 2MB) dataURL support, and hidden by default temp anchors
    // https://github.com/rndme/download
    (function (root, factory) {
      {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
      }
    })(commonjsGlobal, function () {
      return function download(data, strFileName, strMimeType) {
        var self = window,
            // this script is only for browsers anyway...
        defaultMime = "application/octet-stream",
            // this default mime also triggers iframe downloads
        mimeType = strMimeType || defaultMime,
            payload = data,
            url = !strFileName && !strMimeType && payload,
            anchor = document.createElement("a"),
            toString = function (a) {
          return String(a);
        },
            myBlob = self.Blob || self.MozBlob || self.WebKitBlob || toString,
            fileName = strFileName || "download",
            blob,
            reader;

        myBlob = myBlob.call ? myBlob.bind(self) : Blob;

        if (String(this) === "true") {
          //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
          payload = [payload, mimeType];
          mimeType = payload[0];
          payload = payload[1];
        }

        if (url && url.length < 2048) {
          // if no filename and no mime, assume a url was passed as the only argument
          fileName = url.split("/").pop().split("?")[0];
          anchor.href = url; // assign href prop to temp anchor

          if (anchor.href.indexOf(url) !== -1) {
            // if the browser determines that it's a potentially valid url path:
            var ajax = new XMLHttpRequest();
            ajax.open("GET", url, true);
            ajax.responseType = 'blob';

            ajax.onload = function (e) {
              download(e.target.response, fileName, defaultMime);
            };

            setTimeout(function () {
              ajax.send();
            }, 0); // allows setting custom ajax headers using the return:

            return ajax;
          } // end if valid url?

        } // end if url?
        //go ahead and download dataURLs right away


        if (/^data:([\w+-]+\/[\w+.-]+)?[,;]/.test(payload)) {
          if (payload.length > 1024 * 1024 * 1.999 && myBlob !== toString) {
            payload = dataUrlToBlob(payload);
            mimeType = payload.type || defaultMime;
          } else {
            return navigator.msSaveBlob ? // IE10 can't do a[download], only Blobs:
            navigator.msSaveBlob(dataUrlToBlob(payload), fileName) : saver(payload); // everyone else can save dataURLs un-processed
          }
        } else {
          //not data url, is it a string with special needs?
          if (/([\x80-\xff])/.test(payload)) {
            var i = 0,
                tempUiArr = new Uint8Array(payload.length),
                mx = tempUiArr.length;

            for (i; i < mx; ++i) tempUiArr[i] = payload.charCodeAt(i);

            payload = new myBlob([tempUiArr], {
              type: mimeType
            });
          }
        }

        blob = payload instanceof myBlob ? payload : new myBlob([payload], {
          type: mimeType
        });

        function dataUrlToBlob(strUrl) {
          var parts = strUrl.split(/[:;,]/),
              type = parts[1],
              decoder = parts[2] == "base64" ? atob : decodeURIComponent,
              binData = decoder(parts.pop()),
              mx = binData.length,
              i = 0,
              uiArr = new Uint8Array(mx);

          for (i; i < mx; ++i) uiArr[i] = binData.charCodeAt(i);

          return new myBlob([uiArr], {
            type: type
          });
        }

        function saver(url, winMode) {
          if ('download' in anchor) {
            //html5 A[download]
            anchor.href = url;
            anchor.setAttribute("download", fileName);
            anchor.className = "download-js-link";
            anchor.innerHTML = "downloading...";
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            setTimeout(function () {
              anchor.click();
              document.body.removeChild(anchor);

              if (winMode === true) {
                setTimeout(function () {
                  self.URL.revokeObjectURL(anchor.href);
                }, 250);
              }
            }, 66);
            return true;
          } // handle non-a[download] safari as best we can:


          if (/(Version)\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari\//.test(navigator.userAgent)) {
            if (/^data:/.test(url)) url = "data:" + url.replace(/^data:([\w\/\-\+]+)/, defaultMime);

            if (!window.open(url)) {
              // popup blocked, offer direct download:
              if (confirm("Displaying New Document\n\nUse Save As... to download, then click back to return to this page.")) {
                location.href = url;
              }
            }

            return true;
          } //do iframe dataURL download (old ch+FF):


          var f = document.createElement("iframe");
          document.body.appendChild(f);

          if (!winMode && /^data:/.test(url)) {
            // force a mime that will download:
            url = "data:" + url.replace(/^data:([\w\/\-\+]+)/, defaultMime);
          }

          f.src = url;
          setTimeout(function () {
            document.body.removeChild(f);
          }, 333);
        } //end saver


        if (navigator.msSaveBlob) {
          // IE10+ : (has Blob, but not a[download] or URL)
          return navigator.msSaveBlob(blob, fileName);
        }

        if (self.URL) {
          // simple fast and modern way using Blob and URL:
          saver(self.URL.createObjectURL(blob), true);
        } else {
          // handle non-Blob()+non-URL browsers:
          if (typeof blob === "string" || blob.constructor === toString) {
            try {
              return saver("data:" + mimeType + ";base64," + self.btoa(blob));
            } catch (y) {
              return saver("data:" + mimeType + "," + encodeURIComponent(blob));
            }
          } // Blob but not URL support:


          reader = new FileReader();

          reader.onload = function (e) {
            saver(this.result);
          };

          reader.readAsDataURL(blob);
        }

        return true;
      };
      /* end download() */
    });
  });

  class Visualizer {
    constructor(width, height, canvas) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas = canvas;
      this.width = width;
      this.height = height;
      /**
       * Canvas resolution correction based on the device pixel-ratio.
       * The canvas is first scaled to it's actual size based on the pixel ratio.
       * Then the bounds of the canvas is reduced to display size using CSS.
       * Then the contents of the canvas are upscaled by the device pixel-ratio.
       * 
       * In the end, we get a sharper canvas with same size elements
       */

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.ctx = this.canvas.getContext('2d');
      this.ctx.scale(dpr, dpr);
      this.ctx.translate(width * 0.5, height * 0.5);
      this.nodes = [];
      this.sender = {
        percentage: 0
      };
    }
    /**
     * Updates the positions of all the connected nodes in the graph
     */


    updateAllPos() {
      // Get only the connected nodes by removing the client node
      const nodes = this.nodes;
      const divisions = 360 / nodes.length;
      /**
       * If only one 1 node is present in the network,
       * then it must be placed at the centre of the canvas
       */

      if (nodes.length == 1) {
        nodes[0].cx = 0;
        nodes[0].cy = 0;
        return;
      }

      nodes.forEach((node, i) => {
        // Calculate the angle that line makes
        const angle = divisions * (i + 1) * Math.PI / 180;
        const r = 100;
        node.cx = r * Math.cos(angle);
        node.cy = r * Math.sin(angle);
      });
    }
    /**
     * Adds a node to the graph
     * @param {String} name Name/Identifier of the node. Must be unique
     * @param {Array} pos Array of two elements that have location values of the node
     * @param {Boolean} isClient Dentoes whether the node is the current client
     */


    addNode(name, isClient, pos) {
      const nodeData = {
        name,
        radius: 30,
        cx: pos ? pos[0] : undefined,
        cy: pos ? pos[1] : undefined,
        textColor: isClient ? '#C5C7CC' : '#636979'
      };
      const nodeDuplID = this.nodes.findIndex(node => node.name === name);
      if (nodeDuplID > -1) this.nodes[nodeDuplID] = nodeData;else this.nodes.push(nodeData);
      if (!pos) this.updateAllPos();
      this.updateCanvas();
    }
    /**
     * Removes a node from the graph
     * @param {String} name Identifier of the node
     */


    removeNode(name) {
      const nodeDuplID = this.nodes.findIndex(node => node.name === name);

      if (nodeDuplID > -1) {
        this.nodes.splice(nodeDuplID, 1);
        this.updateAllPos();
        this.updateCanvas();
      }
    }
    /**
     * Updates the entire graph by redrawing the canvas
     */


    updateCanvas() {
      /**
       * Empty the canvas, and add the updated nodes, connections and labels
       */
      this.ctx.clearRect(-this.width, -this.height, 2 * this.width, 2 * this.height);
      /**
       * Adds the connection links between all the nodes
       */

      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          new CanvasElements.Line({
            x: this.nodes[i].cx,
            y: this.nodes[i].cy,
            x2: this.nodes[j].cx,
            y2: this.nodes[j].cy,
            borderWidth: 1.3,
            borderColor: 'rgba(99, 105, 121, 0.5)',
            ctx: this.ctx
          });
        }
      }
      /**
       * Creates the file transfer indicator line
       */


      if (this.sender && this.sender.name) {
        this.addSender(this.sender.name, this.sender.percentage);
        this.nodes.forEach(node => {
          if (node.name === this.sender.name) return; // Get the (x, y) coordinates of sender and receiver node

          const x1 = this.sender.cx;
          const y1 = this.sender.cy;
          const x2 = node.cx;
          const y2 = node.cy; // Calculate the total distance between the node

          const dis = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) - this.sender.radius - node.radius; // Calculate the angle of line between the nodes along x axis.
          // Slope is calculated first

          const angle = Math.atan2(y2 - y1, x2 - x1); // Calculate the distance based on percentage value

          let r = this.sender.percentage / 100 * dis; // Create the line based on polar system

          new CanvasElements.Line({
            x: x1 + this.sender.radius * Math.cos(angle),
            y: y1 + this.sender.radius * Math.sin(angle),
            r: r,
            angle: angle,
            borderWidth: 2,
            borderColor: '#3BE8B0',
            ctx: this.ctx
          });
        });
      }

      const primaryColor = d => d.name === this.sender.name || this.sender.percentage >= 99 ? '#3BE8B0' : '#636979';
      /**
       * Adds the nodes
       */


      this.nodes.forEach((node, i) => {
        /**
         * Add waves to current client node
         */
        if (i === 0) {
          const radii = [50, 40];
          radii.forEach(radius => new CanvasElements.Circle({
            x: node.cx,
            y: node.cy,
            r: radius,
            // If the current client is the sender, then show green waves, otherwise gray
            background: this.sender.name === node.name ? 'rgba(59, 232, 176, 0.1)' : 'rgba(99, 105, 121, 0.1)',
            ctx: this.ctx
          }));
        }

        new CanvasElements.Circle({
          x: node.cx,
          y: node.cy,
          r: node.radius,
          background: '#0D1322',
          borderColor: primaryColor(node),
          borderWidth: 2.5,
          ctx: this.ctx
        });
      });
      /**
       * Adds the avatar text
       */

      this.nodes.forEach(node => {
        new CanvasElements.Text({
          x: node.cx,
          y: node.cy,
          text: node.name[0].toUpperCase(),
          font: '"Rubik", sans-serif',
          align: 'center',
          baseline: 'middle',
          size: node.radius / 1.2,
          background: primaryColor(node),
          ctx: this.ctx
        });
      });
      /**
       * Adds the nickname labels
       */

      this.nodes.forEach(node => new CanvasElements.Text({
        x: node.cx,
        y: node.cy + node.radius + 20,
        text: node.name,
        font: '"Rubik", sans-serif',
        align: 'center',
        baseline: 'middle',
        size: 13,
        background: node.textColor,
        weight: '500',
        ctx: this.ctx
      }));
    }
    /**
     * Adds the sender client
     * @param {String} name Name of the client who is sending the files
     * @param {Number} percentage Completed file transfer percentage
     */


    addSender(name, percentage = 0) {
      this.sender = { ...this.nodes.filter(node => node.name === name)[0],
        percentage
      };
    }
    /**
     * Removes the sender client and resets for next file transfer
     */


    removeSender() {
      this.sender = {
        percentage: 0
      };
      this.updateCanvas();
    }
    /**
     * Updates the file transfer percentage
     * @param {Number} percentage Completed file transfer percentage
     */


    setTransferPercentage(percentage) {
      if (percentage > 100) percentage = 100;
      this.sender.percentage = percentage;
      this.updateCanvas();
    }

  }
  /**
   * Returns an easy to read formatted size
   * @param {Number} size Size of the file in bytes
   * @returns {String} Formatted size
   */


  function formatSize(size) {
    return size / (1024 * 1024) < 1 ? Math.round(size / 1024 * 10) / 10 + 'KB' : Math.round(size / (1024 * 1024) * 10) / 10 + 'MB';
  }
  /**
   * Opens a socket connection to join a room
   * @param {String} room Room to join
   * @param {String} username Name of the user joining the room
   */


  function socketConnect(room, username) {
    return io('//' + window.location.host, {
      query: `room=${room}&user=${username}`
    });
  }
  /* public/components/Fab.svelte generated by Svelte v3.42.1 */


  function create_fragment$2(ctx) {
    let button;
    let span;
    let t0;
    let div;
    let t1;
    let t2;
    let current;
    let mounted;
    let dispose;
    const default_slot_template =
    /*#slots*/
    ctx[5].default;
    const default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[4], null);
    return {
      c() {
        button = element("button");
        span = element("span");
        t0 = space();
        div = element("div");
        t1 = text(
        /*text*/
        ctx[0]);
        t2 = space();
        if (default_slot) default_slot.c();
        attr(span, "class",
        /*icon*/
        ctx[1]);
        attr(div, "class", "lg-text");
        attr(button, "class", "fab");
        attr(button, "aria-label",
        /*text*/
        ctx[0]);
        button.disabled =
        /*disabled*/
        ctx[2];
      },

      m(target, anchor) {
        insert(target, button, anchor);
        append(button, span);
        append(button, t0);
        append(button, div);
        append(div, t1);
        append(button, t2);

        if (default_slot) {
          default_slot.m(button, null);
        }

        current = true;

        if (!mounted) {
          dispose = listen(button, "click",
          /*click_handler*/
          ctx[6]);
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        if (!current || dirty &
        /*icon*/
        2) {
          attr(span, "class",
          /*icon*/
          ctx[1]);
        }

        if (!current || dirty &
        /*text*/
        1) set_data(t1,
        /*text*/
        ctx[0]);

        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope*/
          16)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[4], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[4]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[4], dirty, null), null);
          }
        }

        if (!current || dirty &
        /*text*/
        1) {
          attr(button, "aria-label",
          /*text*/
          ctx[0]);
        }

        if (!current || dirty &
        /*disabled*/
        4) {
          button.disabled =
          /*disabled*/
          ctx[2];
        }
      },

      i(local) {
        if (current) return;
        transition_in(default_slot, local);
        current = true;
      },

      o(local) {
        transition_out(default_slot, local);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(button);
        if (default_slot) default_slot.d(detaching);
        mounted = false;
        dispose();
      }

    };
  }

  function instance$2($$self, $$props, $$invalidate) {
    let {
      $$slots: slots = {},
      $$scope
    } = $$props;
    const dispatch = createEventDispatcher();
    let {
      text,
      icon,
      disabled = false
    } = $$props;

    const click_handler = e => dispatch('click', e);

    $$self.$$set = $$props => {
      if ('text' in $$props) $$invalidate(0, text = $$props.text);
      if ('icon' in $$props) $$invalidate(1, icon = $$props.icon);
      if ('disabled' in $$props) $$invalidate(2, disabled = $$props.disabled);
      if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    };

    return [text, icon, disabled, dispatch, $$scope, slots, click_handler];
  }

  class Fab extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$2, create_fragment$2, safe_not_equal, {
        text: 0,
        icon: 1,
        disabled: 2
      });
    }

  }

  function fade(node, {
    delay = 0,
    duration = 400,
    easing = identity
  } = {}) {
    const o = +getComputedStyle(node).opacity;
    return {
      delay,
      duration,
      easing,
      css: t => `opacity: ${t * o}`
    };
  }
  /* public/components/Modal.svelte generated by Svelte v3.42.1 */


  function create_if_block$1(ctx) {
    let div1;
    let t;
    let div0;
    let div1_transition;
    let current;
    let if_block =
    /*isClosable*/
    ctx[1] && create_if_block_1$1(ctx);
    const default_slot_template =
    /*#slots*/
    ctx[4].default;
    const default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[3], null);
    return {
      c() {
        div1 = element("div");
        if (if_block) if_block.c();
        t = space();
        div0 = element("div");
        if (default_slot) default_slot.c();
        attr(div0, "class", "modal");
        attr(div1, "class", "modal-wrapper");
      },

      m(target, anchor) {
        insert(target, div1, anchor);
        if (if_block) if_block.m(div1, null);
        append(div1, t);
        append(div1, div0);

        if (default_slot) {
          default_slot.m(div0, null);
        }

        current = true;
      },

      p(ctx, dirty) {
        if (
        /*isClosable*/
        ctx[1]) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_1$1(ctx);
            if_block.c();
            if_block.m(div1, t);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }

        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope*/
          8)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[3], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[3]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[3], dirty, null), null);
          }
        }
      },

      i(local) {
        if (current) return;
        transition_in(default_slot, local);
        add_render_callback(() => {
          if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {
            duration: 200
          }, true);
          div1_transition.run(1);
        });
        current = true;
      },

      o(local) {
        transition_out(default_slot, local);
        if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {
          duration: 200
        }, false);
        div1_transition.run(0);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(div1);
        if (if_block) if_block.d();
        if (default_slot) default_slot.d(detaching);
        if (detaching && div1_transition) div1_transition.end();
      }

    };
  } // (33:4) {#if isClosable}


  function create_if_block_1$1(ctx) {
    let button;
    let mounted;
    let dispose;
    return {
      c() {
        button = element("button");
        attr(button, "class", "thin icon icon-cancel");
        attr(button, "aria-label", "Close Modal");
      },

      m(target, anchor) {
        insert(target, button, anchor);

        if (!mounted) {
          dispose = [listen(button, "click",
          /*click_handler*/
          ctx[5]), listen(button, "keydown",
          /*keydown_handler*/
          ctx[6])];
          mounted = true;
        }
      },

      p: noop,

      d(detaching) {
        if (detaching) detach(button);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function create_fragment$3(ctx) {
    let if_block_anchor;
    let current;
    let mounted;
    let dispose;
    let if_block =
    /*isOpen*/
    ctx[0] && create_if_block$1(ctx);
    return {
      c() {
        if (if_block) if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;

        if (!mounted) {
          dispose = listen(window, "keydown",
          /*keyHandler*/
          ctx[2]);
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        if (
        /*isOpen*/
        ctx[0]) {
          if (if_block) {
            if_block.p(ctx, dirty);

            if (dirty &
            /*isOpen*/
            1) {
              transition_in(if_block, 1);
            }
          } else {
            if_block = create_if_block$1(ctx);
            if_block.c();
            transition_in(if_block, 1);
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        } else if (if_block) {
          group_outros();
          transition_out(if_block, 1, 1, () => {
            if_block = null;
          });
          check_outros();
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if (if_block) if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
        mounted = false;
        dispose();
      }

    };
  }

  function blurApp(isOpen) {
    const app = document.getElementById('app');
    if (app) app.style.filter = isOpen ? 'blur(18px)' : '';
    document.body.classList.toggle('no-bg-image', isOpen);
  }

  function instance$3($$self, $$props, $$invalidate) {
    let {
      $$slots: slots = {},
      $$scope
    } = $$props;
    let {
      isOpen = true
    } = $$props;
    let {
      isClosable = true
    } = $$props;
    /**
    * Closes the modal when ESC key is pressed
    */

    function keyHandler(e) {
      if (e.keyCode === 27 || e.which === 27) {
        $$invalidate(0, isOpen = false);
      }
    }

    const click_handler = () => $$invalidate(0, isOpen = false);

    const keydown_handler = e => {
      if (e.which === 13) $$invalidate(0, isOpen = false);
    };

    $$self.$$set = $$props => {
      if ('isOpen' in $$props) $$invalidate(0, isOpen = $$props.isOpen);
      if ('isClosable' in $$props) $$invalidate(1, isClosable = $$props.isClosable);
      if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    };

    $$self.$$.update = () => {
      if ($$self.$$.dirty &
      /*isOpen*/
      1) {
        blurApp(isOpen);
      }
    };

    return [isOpen, isClosable, keyHandler, $$scope, slots, click_handler, keydown_handler];
  }

  class Modal extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$3, create_fragment$3, safe_not_equal, {
        isOpen: 0,
        isClosable: 1
      });
    }

  }
  /* public/components/FileDrop.svelte generated by Svelte v3.42.1 */


  function create_fragment$4(ctx) {
    let div;
    let mounted;
    let dispose;
    return {
      c() {
        div = element("div");
        attr(div, "class", "dropzone");
      },

      m(target, anchor) {
        insert(target, div, anchor);

        if (!mounted) {
          dispose = [listen(div, "drop", prevent_default(
          /*dropHandler*/
          ctx[1])), listen(div, "dragover", prevent_default(
          /*modifyBorder*/
          ctx[0]('solid'))), listen(div, "dragleave", prevent_default(
          /*modifyBorder*/
          ctx[0]('none')))];
          mounted = true;
        }
      },

      p: noop,
      i: noop,
      o: noop,

      d(detaching) {
        if (detaching) detach(div);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function instance$4($$self) {
    const dispatch = createEventDispatcher();

    const modifyBorder = style => e => {
      e.target.style.border = style;
    };

    function dropHandler(e) {
      const files = e.dataTransfer.files;
      modifyBorder('none')(e);

      if (files != null) {
        dispatch(files, 'files');
      }
    }

    return [modifyBorder, dropHandler];
  }

  class FileDrop extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    }

  }
  /* public/components/Toast/Toast.svelte generated by Svelte v3.42.1 */


  function create_if_block$2(ctx) {
    let div;
    let t;
    let div_transition;
    let current;
    return {
      c() {
        div = element("div");
        t = text(
        /*message*/
        ctx[0]);
        attr(div, "class", "toast");
      },

      m(target, anchor) {
        insert(target, div, anchor);
        append(div, t);
        current = true;
      },

      p(new_ctx, dirty) {
        ctx = new_ctx;
        if (!current || dirty &
        /*message*/
        1) set_data(t,
        /*message*/
        ctx[0]);
      },

      i(local) {
        if (current) return;
        add_render_callback(() => {
          if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {
            duration: fadeDuration
          }, true);
          div_transition.run(1);
        });
        current = true;
      },

      o(local) {
        if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {
          duration: fadeDuration
        }, false);
        div_transition.run(0);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(div);
        if (detaching && div_transition) div_transition.end();
      }

    };
  }

  function create_fragment$5(ctx) {
    let if_block_anchor;
    let current;
    let if_block =
    /*visible*/
    ctx[1] && create_if_block$2(ctx);
    return {
      c() {
        if (if_block) if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },

      p(ctx, [dirty]) {
        if (
        /*visible*/
        ctx[1]) {
          if (if_block) {
            if_block.p(ctx, dirty);

            if (dirty &
            /*visible*/
            2) {
              transition_in(if_block, 1);
            }
          } else {
            if_block = create_if_block$2(ctx);
            if_block.c();
            transition_in(if_block, 1);
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        } else if (if_block) {
          group_outros();
          transition_out(if_block, 1, 1, () => {
            if_block = null;
          });
          check_outros();
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if (if_block) if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
      }

    };
  }

  const fadeDuration = 200;

  function instance$5($$self, $$props, $$invalidate) {
    let {
      duration = 4000
    } = $$props;
    let {
      message = 'This is a toast'
    } = $$props;
    let visible = true; // Play the fadeOut transition before the Toast is unmounted

    onMount(() => {
      setTimeout(() => {
        $$invalidate(1, visible = false);
      }, duration - fadeDuration);
    });

    $$self.$$set = $$props => {
      if ('duration' in $$props) $$invalidate(2, duration = $$props.duration);
      if ('message' in $$props) $$invalidate(0, message = $$props.message);
    };

    return [message, visible, duration];
  }

  class Toast extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$5, create_fragment$5, safe_not_equal, {
        duration: 2,
        message: 0
      });
    }

  }

  let toast = null;
  /**
   * Displays a toast with a message for some duration
   * @param {String} message Message to be shown in the Toast
   * @param {Number} duration Max duration for the Toast
   */

  function useToast(message, duration = 4000) {
    // Destroy the old Toast if it is still present
    if (toast !== null) {
      toast.$destroy();
    } // Create a new Toast


    toast = new Toast({
      target: document.body,
      intro: true,
      props: {
        message,
        duration
      }
    }); // Destroy the new Toast after duration

    setTimeout(() => {
      toast.$destroy();
      toast = null;
    }, duration);
  }
  /* public/views/FileTransfer.svelte generated by Svelte v3.42.1 */


  function get_each_context(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[21] = list[i];
    return child_ctx;
  } // (399:6) {#if percentage !== null}


  function create_if_block_3(ctx) {
    let div;
    let t0_value = Math.floor(
    /*percentage*/
    ctx[0]) + "";
    let t0;
    let t1;
    return {
      c() {
        div = element("div");
        t0 = text(t0_value);
        t1 = text("%");
        attr(div, "class", "transfer-percentage");
      },

      m(target, anchor) {
        insert(target, div, anchor);
        append(div, t0);
        append(div, t1);
      },

      p(ctx, dirty) {
        if (dirty &
        /*percentage*/
        1 && t0_value !== (t0_value = Math.floor(
        /*percentage*/
        ctx[0]) + "")) set_data(t0, t0_value);
      },

      d(detaching) {
        if (detaching) detach(div);
      }

    };
  } // (419:4) {#if files.length}


  function create_if_block_1$2(ctx) {
    let div2;
    let div1;
    let div0;
    let t1;
    let ul;
    let each_value =
    /*files*/
    ctx[4];
    let each_blocks = [];

    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }

    return {
      c() {
        div2 = element("div");
        div1 = element("div");
        div0 = element("div");
        div0.innerHTML = `<h2>Files</h2>`;
        t1 = space();
        ul = element("ul");

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        attr(div0, "class", "header");
        attr(ul, "class", "files");
        attr(div1, "class", "card files");
        attr(div2, "class", "column");
      },

      m(target, anchor) {
        insert(target, div2, anchor);
        append(div2, div1);
        append(div1, div0);
        append(div1, t1);
        append(div1, ul);

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(ul, null);
        }
      },

      p(ctx, dirty) {
        if (dirty &
        /*files, percentage, formatSize*/
        17) {
          each_value =
          /*files*/
          ctx[4];
          let i;

          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx, each_value, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
            } else {
              each_blocks[i] = create_each_block(child_ctx);
              each_blocks[i].c();
              each_blocks[i].m(ul, null);
            }
          }

          for (; i < each_blocks.length; i += 1) {
            each_blocks[i].d(1);
          }

          each_blocks.length = each_value.length;
        }
      },

      d(detaching) {
        if (detaching) detach(div2);
        destroy_each(each_blocks, detaching);
      }

    };
  } // (437:16) {:else}


  function create_else_block$1(ctx) {
    let svg;
    let circle;
    let circle_style_value;
    return {
      c() {
        svg = svg_element("svg");
        circle = svg_element("circle");
        attr(circle, "cx", "25");
        attr(circle, "cy", "25");
        attr(circle, "r", "10");
        attr(circle, "style", circle_style_value = `stroke-dashoffset:${63 *
        /*percentage*/
        ctx[0] / 100 - 63}`);
        attr(svg, "width", "50");
        attr(svg, "height", "50");
        attr(svg, "class", "file-status");
      },

      m(target, anchor) {
        insert(target, svg, anchor);
        append(svg, circle);
      },

      p(ctx, dirty) {
        if (dirty &
        /*percentage*/
        1 && circle_style_value !== (circle_style_value = `stroke-dashoffset:${63 *
        /*percentage*/
        ctx[0] / 100 - 63}`)) {
          attr(circle, "style", circle_style_value);
        }
      },

      d(detaching) {
        if (detaching) detach(svg);
      }

    };
  } // (434:16) {#if file.sent}


  function create_if_block_2(ctx) {
    let div;
    return {
      c() {
        div = element("div");
        attr(div, "class", "file-status icon-checkmark");
      },

      m(target, anchor) {
        insert(target, div, anchor);
      },

      p: noop,

      d(detaching) {
        if (detaching) detach(div);
      }

    };
  } // (427:12) {#each files as file}


  function create_each_block(ctx) {
    let li;
    let div;
    let h4;
    let t0_value =
    /*file*/
    ctx[21].name + "";
    let t0;
    let t1;
    let h5;
    let t2_value = formatSize(
    /*file*/
    ctx[21].size) + "";
    let t2;
    let t3;
    let t4;

    function select_block_type(ctx, dirty) {
      if (
      /*file*/
      ctx[21].sent) return create_if_block_2;
      return create_else_block$1;
    }

    let current_block_type = select_block_type(ctx);
    let if_block = current_block_type(ctx);
    return {
      c() {
        li = element("li");
        div = element("div");
        h4 = element("h4");
        t0 = text(t0_value);
        t1 = space();
        h5 = element("h5");
        t2 = text(t2_value);
        t3 = space();
        if_block.c();
        t4 = space();
        attr(div, "class", "info");
      },

      m(target, anchor) {
        insert(target, li, anchor);
        append(li, div);
        append(div, h4);
        append(h4, t0);
        append(div, t1);
        append(div, h5);
        append(h5, t2);
        append(li, t3);
        if_block.m(li, null);
        append(li, t4);
      },

      p(ctx, dirty) {
        if (dirty &
        /*files*/
        16 && t0_value !== (t0_value =
        /*file*/
        ctx[21].name + "")) set_data(t0, t0_value);
        if (dirty &
        /*files*/
        16 && t2_value !== (t2_value = formatSize(
        /*file*/
        ctx[21].size) + "")) set_data(t2, t2_value);

        if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block.d(1);
          if_block = current_block_type(ctx);

          if (if_block) {
            if_block.c();
            if_block.m(li, t4);
          }
        }
      },

      d(detaching) {
        if (detaching) detach(li);
        if_block.d();
      }

    };
  } // (461:2) {#if isSelectorEnabled}


  function create_if_block$3(ctx) {
    let filedrop;
    let current;
    filedrop = new FileDrop({});
    filedrop.$on("files",
    /*files_handler*/
    ctx[13]);
    return {
      c() {
        create_component(filedrop.$$.fragment);
      },

      m(target, anchor) {
        mount_component(filedrop, target, anchor);
        current = true;
      },

      p: noop,

      i(local) {
        if (current) return;
        transition_in(filedrop.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(filedrop.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(filedrop, detaching);
      }

    };
  } // (470:0) <Modal isOpen={errorModal.isOpen} isClosable={false}>


  function create_default_slot(ctx) {
    let div;
    let h2;
    let t1;
    let p;
    let t2_value =
    /*errorModal*/
    ctx[1].message + "";
    let t2;
    let t3;
    let button;
    let mounted;
    let dispose;
    return {
      c() {
        div = element("div");
        h2 = element("h2");
        h2.textContent = "Connection Error!";
        t1 = space();
        p = element("p");
        t2 = text(t2_value);
        t3 = space();
        button = element("button");
        button.textContent = "Select new room";
        attr(p, "class", "message");
        attr(button, "class", "wide");
        attr(div, "class", "socket-error");
      },

      m(target, anchor) {
        insert(target, div, anchor);
        append(div, h2);
        append(div, t1);
        append(div, p);
        append(p, t2);
        append(div, t3);
        append(div, button);

        if (!mounted) {
          dispose = listen(button, "click",
          /*click_handler_2*/
          ctx[14]);
          mounted = true;
        }
      },

      p(ctx, dirty) {
        if (dirty &
        /*errorModal*/
        2 && t2_value !== (t2_value =
        /*errorModal*/
        ctx[1].message + "")) set_data(t2, t2_value);
      },

      d(detaching) {
        if (detaching) detach(div);
        mounted = false;
        dispose();
      }

    };
  }

  function create_fragment$6(ctx) {
    let div2;
    let header;
    let button0;
    let t0;
    let h1;
    let t2;
    let button1;
    let t3;
    let main;
    let div1;
    let canvas_1;
    let t4;
    let t5;
    let div0;
    let t6;
    let t7;
    let input;
    let t8;
    let t9;
    let fab;
    let t10;
    let t11;
    let modal;
    let current;
    let mounted;
    let dispose;
    let if_block0 =
    /*percentage*/
    ctx[0] !== null && create_if_block_3(ctx);
    let if_block1 =
    /*files*/
    ctx[4].length && create_if_block_1$2(ctx);
    fab = new Fab({
      props: {
        name: "fab",
        icon: "icon-add",
        disabled: !
        /*isSelectorEnabled*/
        ctx[3],
        text: "Añadir archivos"
      }
    });
    fab.$on("click",
    /*click_handler_1*/
    ctx[12]);
    let if_block2 =
    /*isSelectorEnabled*/
    ctx[3] && create_if_block$3(ctx);
    modal = new Modal({
      props: {
        isOpen:
        /*errorModal*/
        ctx[1].isOpen,
        isClosable: false,
        $$slots: {
          default: [create_default_slot]
        },
        $$scope: {
          ctx
        }
      }
    });
    return {
      c() {
        div2 = element("div");
        header = element("header");
        button0 = element("button");
        t0 = space();
        h1 = element("h1");
        h1.textContent = `${
        /*client*/
        ctx[6].room}`;
        t2 = space();
        button1 = element("button");
        t3 = space();
        main = element("main");
        div1 = element("div");
        canvas_1 = element("canvas");
        t4 = space();
        if (if_block0) if_block0.c();
        t5 = space();
        div0 = element("div");
        t6 = text(
        /*backend*/
        ctx[5]);
        t7 = space();
        input = element("input");
        t8 = space();
        if (if_block1) if_block1.c();
        t9 = space();
        create_component(fab.$$.fragment);
        t10 = space();
        if (if_block2) if_block2.c();
        t11 = space();
        create_component(modal.$$.fragment);
        attr(button0, "class", "thin icon icon-navigate_before left");
        attr(button0, "aria-label", "Go back");
        attr(h1, "class", "room-name");
        attr(button1, "class", "thin icon right");
        set_style(button1, "visibility", "hidden");
        set_style(canvas_1, "margin-left", "-1rem");
        attr(div0, "class", "transfer-tech");
        attr(div1, "class", "column");
        attr(input, "id", "inpFiles");
        attr(input, "type", "file");
        input.hidden = true;
        input.multiple = true;
        attr(main, "class", "row file-transfer");
        attr(div2, "id", "app");
        set_style(div2, "text-align", "center");
      },

      m(target, anchor) {
        insert(target, div2, anchor);
        append(div2, header);
        append(header, button0);
        append(header, t0);
        append(header, h1);
        append(header, t2);
        append(header, button1);
        append(div2, t3);
        append(div2, main);
        append(main, div1);
        append(div1, canvas_1);
        /*canvas_1_binding*/

        ctx[10](canvas_1);
        append(div1, t4);
        if (if_block0) if_block0.m(div1, null);
        append(div1, t5);
        append(div1, div0);
        append(div0, t6);
        append(main, t7);
        append(main, input);
        append(main, t8);
        if (if_block1) if_block1.m(main, null);
        append(div2, t9);
        mount_component(fab, div2, null);
        append(div2, t10);
        if (if_block2) if_block2.m(div2, null);
        insert(target, t11, anchor);
        mount_component(modal, target, anchor);
        current = true;

        if (!mounted) {
          dispose = [listen(button0, "click",
          /*click_handler*/
          ctx[9]), listen(input, "change",
          /*change_handler*/
          ctx[11])];
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        if (
        /*percentage*/
        ctx[0] !== null) {
          if (if_block0) {
            if_block0.p(ctx, dirty);
          } else {
            if_block0 = create_if_block_3(ctx);
            if_block0.c();
            if_block0.m(div1, t5);
          }
        } else if (if_block0) {
          if_block0.d(1);
          if_block0 = null;
        }

        if (!current || dirty &
        /*backend*/
        32) set_data(t6,
        /*backend*/
        ctx[5]);

        if (
        /*files*/
        ctx[4].length) {
          if (if_block1) {
            if_block1.p(ctx, dirty);
          } else {
            if_block1 = create_if_block_1$2(ctx);
            if_block1.c();
            if_block1.m(main, null);
          }
        } else if (if_block1) {
          if_block1.d(1);
          if_block1 = null;
        }

        const fab_changes = {};
        if (dirty &
        /*isSelectorEnabled*/
        8) fab_changes.disabled = !
        /*isSelectorEnabled*/
        ctx[3];
        fab.$set(fab_changes);

        if (
        /*isSelectorEnabled*/
        ctx[3]) {
          if (if_block2) {
            if_block2.p(ctx, dirty);

            if (dirty &
            /*isSelectorEnabled*/
            8) {
              transition_in(if_block2, 1);
            }
          } else {
            if_block2 = create_if_block$3(ctx);
            if_block2.c();
            transition_in(if_block2, 1);
            if_block2.m(div2, null);
          }
        } else if (if_block2) {
          group_outros();
          transition_out(if_block2, 1, 1, () => {
            if_block2 = null;
          });
          check_outros();
        }

        const modal_changes = {};
        if (dirty &
        /*errorModal*/
        2) modal_changes.isOpen =
        /*errorModal*/
        ctx[1].isOpen;

        if (dirty &
        /*$$scope, errorModal*/
        16777218) {
          modal_changes.$$scope = {
            dirty,
            ctx
          };
        }

        modal.$set(modal_changes);
      },

      i(local) {
        if (current) return;
        transition_in(fab.$$.fragment, local);
        transition_in(if_block2);
        transition_in(modal.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(fab.$$.fragment, local);
        transition_out(if_block2);
        transition_out(modal.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(div2);
        /*canvas_1_binding*/

        ctx[10](null);
        if (if_block0) if_block0.d();
        if (if_block1) if_block1.d();
        destroy_component(fab);
        if (if_block2) if_block2.d();
        if (detaching) detach(t11);
        destroy_component(modal, detaching);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function instance$6($$self, $$props, $$invalidate) {
    const data = JSON.parse(localStorage.getItem('blaze'));
    let errorModal = {
      isOpen: false,
      message: ''
    };
    let visualizer,
        socket,
        usersCount = 1;
    let client = { ...data.user,
      room: window.location.pathname.split('/').reverse()[0]
    };
    let canvas,
        isSelectorEnabled = false,
        files = [];
    let backend = 'Esperando a otros dispositivos que entren en la misma sala';
    let percentage = null;
    /**
    * Add the current room in recent rooms list
    */

    if (!data.rooms.includes(client.room)) {
      localStorage.setItem('blaze', JSON.stringify({ ...data,
        rooms: [client.room, ...data.rooms]
      }));
    }

    function selectFiles(e) {
      const inputFiles = e;
      /**
      * Firefox for mobile has issue with selection of multiple files.
      * Only one file gets selected and that has '0' size. This is
      * checked here before proceeding to transfer the invalid file.
      */

      if (inputFiles[0].size === 0) {
        useToast('Multiple files not supported');
        return;
      }
      /**
      * Web worker is setup to compress the files off the main thread
      * Send the files to the worker to compress them as a zip
      */


      const worker = new Worker('/worker.js');
      worker.postMessage(inputFiles);

      for (let i = 0; i < inputFiles.length; i++) {
        const file = inputFiles[i];
        $$invalidate(4, files = [{
          name: file.name,
          size: file.size,
          sent: false
        }, ...files]);
      }

      worker.addEventListener('message', evt => {
        /**
        * Pre file transfer DOM changes are made here
        * Set the sender in visualizer
        */
        visualizer.addSender(client.name); // Start the file transfer

        fileTransfer(evt.data).then(resetState).catch(err => {
          console.log('Error en transferencia de archivo', err);
        });
      });
      /**
      * Error from the worker
      */

      worker.addEventListener('error', err => {
        console.log('Error en compresión de archivo', err);
      });
    }
    /**
    * Sends the file in chunks acorss socket connection
    * @param {ArrayBuffer} file File object which has to be sent
    * @param {Array} meta Meta data of files which are being sent
    */


    function fileTransfer(file) {
      let data = file,
          sent = 0;
      const size = data.byteLength;
      const transferStatus = {
        peers: Array(usersCount - 1),
        percent: 25
      };
      /**
      * Initially meta data is shared
      */

      socket.emit('file', {
        user: client.name,
        size,
        meta: files.filter(item => !item.sent)
      });
      return new Promise((resolve, reject) => {
        function stream() {
          /**
          * If all the chunks are sent
          */
          if (!data.byteLength) {
            /**
            * Indicates that the stream has ended and file should now be built
            * on the receiver's system
            */
            socket.emit('file', {
              end: true
            }); // Switch off the status event listener as transfer is complete

            socket.off('rec-status');
            /**
            * 2 seconds timeout before the file transfer is resolved
            */

            setTimeout(() => resolve(), 2000);
            return;
          }
          /**
          * Defines the size of data that will be sent in each request (KBs)
          * Set to 16 KBs
          */


          let block = 1024 * 16; // Block size correction if data remaining is lesser than block

          block = block > data.byteLength ? data.byteLength : block;
          /**
          * Send a chunk of data
          */

          socket.emit('file-data', data.slice(0, block));
          /**
          * Update for next iteration
          */

          sent += block;
          data = data.slice(block, data.byteLength);
          /**
          * Percentage calculation and DOM update
          */

          $$invalidate(0, percentage = sent * 100 / size);
          visualizer.setTransferPercentage(percentage);

          if (transferStatus.peers.length === usersCount - 1 && percentage < transferStatus.percent) {
            /**
            * Timeout is used as this will allow us to control the time interval between successive streams
            */
            setTimeout(stream, 1);
          }
        }

        stream();
        socket.on('rec-status', data => {
          if (data.percent !== transferStatus.percent) {
            transferStatus.percent = data.percent;
            transferStatus.peers = [data.peer];
          } else {
            transferStatus.peers.push(data.peer);
          }

          stream();
        });
      });
    }
    /**
    * DOM is reset to prepare for the next file transfer
    */


    function resetState() {
      visualizer.removeSender();
      $$invalidate(0, percentage = null); // Mark the unsent files as sent

      $$invalidate(4, files = files.map(file => {
        file.sent = true;
        return file;
      })); // Remove the file from the input

      document.getElementById('inpFiles').value = '';
    }

    onMount(() => {
      socket = new P2P(socketConnect(client.room, client.name), {
        peerOpts: {
          config: {
            iceServers: [{
              urls: 'stun:stun.l.google.com:19302'
            }, {
              urls: 'stun:global.stun.twilio.com:3478?transport=udp'
            }, {
              urls: 'stun:stun.services.mozilla.com'
            }, {
              urls: 'turn:numb.viagenie.ca',
              username: 'akash.hamirwasia@gmail.com',
              credential: '6NfWZz9kUCPmNbe'
            }]
          }
        }
      }, () => {
        /**
        * Connection upgrded to WebRTC
        */
        $$invalidate(5, backend = 'Using WebRTC');
      });
      /**
      * A user joins the room
      */

      socket.on('userJoin', users => {
        /**
        * Online users list is rendered
        */
        users.forEach(user => {
          if (user === client.name) return;
          visualizer.addNode(user);
          /**
          * Fallback WebSockets tech is used by default. When connection switches to WebRTC,
          * then the update is made in a separate event - set during the socket initialization
          */

          if (backend !== 'Using WebRTC') $$invalidate(5, backend = 'Using WebSockets');
        });
        $$invalidate(8, usersCount = users.length);
      });
      /**
      * A user leaves the room
      */

      socket.on('userLeft', user => {
        // Remove the user from the visualizer
        visualizer.removeNode(user); // Update the userCount

        $$invalidate(8, usersCount -= 1);
      });
      /**
      * If there's some problem in socket connection, then send the user back to the app homepage
      */

      socket.on('error', error => {
        $$invalidate(1, errorModal = {
          isOpen: true,
          message: error
        });
      });

      if (window.matchMedia('(min-width: 800px)').matches) {
        // Visualizer is half the width of the browser window if on desktops
        visualizer = new Visualizer(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2), canvas);
      } else {
        // On mobiles, occupy full width of the screen
        visualizer = new Visualizer(window.innerWidth, Math.floor(window.innerHeight / 2), canvas);
      }

      visualizer.addNode(client.name, true);
      /**
      * Receiving the file
      */

      (function () {
        let fileParts = [];
        let metaData = {};
        let intPerc = 25,
            size = 0;
        socket.on('file', data => {
          if (data.end) {
            if (fileParts.length) {
              download(new Blob(fileParts), 'blaze_files.zip');
              fileParts = [];
              size = 0;
              intPerc = 25;
            }
            /**
            * Download complete! Yay!
            * Reset the state of the app for next data transfer
            */


            setTimeout(resetState, 2000);
          } else {
            /**
            * If data does not have 'end' key, then meta data has been sent just before
            * the file transfer
            */
            metaData = data;
            visualizer.addSender(data.user);
            $$invalidate(4, files = [...data.meta, ...files]);
          }
        });
        socket.on('file-data', data => {
          // document.getElementById('btn-addFiles').disabled = true;
          fileParts.push(data);
          size += data.byteLength;
          $$invalidate(0, percentage = size * 100 / metaData.size);

          if (percentage >= intPerc) {
            intPerc += 15;
            socket.emit('rec-status', {
              percent: intPerc,
              peer: client.name,
              sender: metaData.user
            });
          }

          visualizer.setTransferPercentage(percentage);
        });
      })();
      /**
      * Component being unmounted
      */


      return () => {
        socket.disconnect();
      };
    });

    function watchUsersCount(usersCount, percentage) {
      $$invalidate(3, isSelectorEnabled = usersCount - 1 ? true : false);
      $$invalidate(3, isSelectorEnabled = percentage === null ? isSelectorEnabled : false);
    }

    const click_handler = () => window.history.back();

    function canvas_1_binding($$value) {
      binding_callbacks[$$value ? 'unshift' : 'push'](() => {
        canvas = $$value;
        $$invalidate(2, canvas);
      });
    }

    const change_handler = ev => selectFiles(ev.target.files);

    const click_handler_1 = () => document.getElementById('inpFiles').click();

    const files_handler = files => selectFiles(files);

    const click_handler_2 = () => {
      $$invalidate(1, errorModal.isOpen = false, errorModal);
      navigate('/app', {
        replace: true
      });
    };

    $$self.$$.update = () => {
      if ($$self.$$.dirty &
      /*usersCount, percentage*/
      257) {
        watchUsersCount(usersCount, percentage);
      }
    };

    return [percentage, errorModal, canvas, isSelectorEnabled, files, backend, client, selectFiles, usersCount, click_handler, canvas_1_binding, change_handler, click_handler_1, files_handler, click_handler_2];
  }

  class FileTransfer extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    }

  }
  /* public/views/Rooms.svelte generated by Svelte v3.42.1 */


  function get_each_context$1(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[11] = list[i];
    return child_ctx;
  } // (86:4) {:else}


  function create_else_block$2(ctx) {
    let div;
    return {
      c() {
        div = element("div");
        div.textContent = "Connect to the internet to start sharing files";
        attr(div, "class", "message");
      },

      m(target, anchor) {
        insert(target, div, anchor);
      },

      p: noop,
      i: noop,
      o: noop,

      d(detaching) {
        if (detaching) detach(div);
      }

    };
  } // (62:4) {#if onLine}


  function create_if_block$4(ctx) {
    let ul;
    let t;
    let fab;
    let current;
    let if_block =
    /*rooms*/
    ctx[0] &&
    /*rooms*/
    ctx[0].length && create_if_block_1$3(ctx);
    fab = new Fab({
      props: {
        icon: "icon-add",
        text: "Nueva sala"
      }
    });
    fab.$on("click",
    /*click_handler_2*/
    ctx[8]);
    return {
      c() {
        ul = element("ul");
        if (if_block) if_block.c();
        t = space();
        create_component(fab.$$.fragment);
        attr(ul, "class", "recent-rooms");
      },

      m(target, anchor) {
        insert(target, ul, anchor);
        if (if_block) if_block.m(ul, null);
        insert(target, t, anchor);
        mount_component(fab, target, anchor);
        current = true;
      },

      p(ctx, dirty) {
        if (
        /*rooms*/
        ctx[0] &&
        /*rooms*/
        ctx[0].length) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_1$3(ctx);
            if_block.c();
            if_block.m(ul, null);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }
      },

      i(local) {
        if (current) return;
        transition_in(fab.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(fab.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(ul);
        if (if_block) if_block.d();
        if (detaching) detach(t);
        destroy_component(fab, detaching);
      }

    };
  } // (64:8) {#if rooms && rooms.length}


  function create_if_block_1$3(ctx) {
    let each_1_anchor;
    let each_value =
    /*rooms*/
    ctx[0];
    let each_blocks = [];

    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    }

    return {
      c() {
        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        each_1_anchor = empty();
      },

      m(target, anchor) {
        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(target, anchor);
        }

        insert(target, each_1_anchor, anchor);
      },

      p(ctx, dirty) {
        if (dirty &
        /*navigate, rooms, removeRoom*/
        9) {
          each_value =
          /*rooms*/
          ctx[0];
          let i;

          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context$1(ctx, each_value, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
            } else {
              each_blocks[i] = create_each_block$1(child_ctx);
              each_blocks[i].c();
              each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
            }
          }

          for (; i < each_blocks.length; i += 1) {
            each_blocks[i].d(1);
          }

          each_blocks.length = each_value.length;
        }
      },

      d(detaching) {
        destroy_each(each_blocks, detaching);
        if (detaching) detach(each_1_anchor);
      }

    };
  } // (65:10) {#each rooms as room}


  function create_each_block$1(ctx) {
    let li;
    let div;
    let t0_value =
    /*room*/
    ctx[11] + "";
    let t0;
    let t1;
    let button;
    let t2;
    let mounted;
    let dispose;

    function click_handler() {
      return (
        /*click_handler*/
        ctx[6](
        /*room*/
        ctx[11])
      );
    }

    function click_handler_1() {
      return (
        /*click_handler_1*/
        ctx[7](
        /*room*/
        ctx[11])
      );
    }

    return {
      c() {
        li = element("li");
        div = element("div");
        t0 = text(t0_value);
        t1 = space();
        button = element("button");
        t2 = space();
        attr(button, "class", "thin icon icon-cancel");
        attr(button, "aria-label", "Remove room");
        attr(li, "role", "link");
        attr(li, "tabindex", "0");
      },

      m(target, anchor) {
        insert(target, li, anchor);
        append(li, div);
        append(div, t0);
        append(li, t1);
        append(li, button);
        append(li, t2);

        if (!mounted) {
          dispose = [listen(button, "click", stop_propagation(click_handler)), listen(li, "click", click_handler_1)];
          mounted = true;
        }
      },

      p(new_ctx, dirty) {
        ctx = new_ctx;
        if (dirty &
        /*rooms*/
        1 && t0_value !== (t0_value =
        /*room*/
        ctx[11] + "")) set_data(t0, t0_value);
      },

      d(detaching) {
        if (detaching) detach(li);
        mounted = false;
        run_all(dispose);
      }

    };
  } // (95:0) <Modal isOpen={newRoomModal.isOpen}>


  function create_default_slot$1(ctx) {
    let form;
    let input;
    let t0;
    let button;
    let mounted;
    let dispose;
    return {
      c() {
        form = element("form");
        input = element("input");
        t0 = space();
        button = element("button");
        button.textContent = "Entrar en sala";
        attr(input, "type", "text");
        attr(input, "maxlength", "10");
        input.required = true;
        attr(input, "placeholder", "Nombre de Sala");
        attr(input, "pattern", "[A-Za-z0-9]+");
        set_style(input, "margin-top", "0");
        attr(button, "type", "submit");
        attr(button, "class", "wide");
        attr(form, "class", "join-room");
      },

      m(target, anchor) {
        insert(target, form, anchor);
        append(form, input);
        set_input_value(input,
        /*newRoomModal*/
        ctx[1].roomName);
        append(form, t0);
        append(form, button);

        if (!mounted) {
          dispose = [listen(input, "input",
          /*input_input_handler*/
          ctx[9]), listen(form, "submit", prevent_default(
          /*joinRoom*/
          ctx[4]))];
          mounted = true;
        }
      },

      p(ctx, dirty) {
        if (dirty &
        /*newRoomModal*/
        2 && input.value !==
        /*newRoomModal*/
        ctx[1].roomName) {
          set_input_value(input,
          /*newRoomModal*/
          ctx[1].roomName);
        }
      },

      d(detaching) {
        if (detaching) detach(form);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function create_fragment$7(ctx) {
    let div;
    let header;
    let t1;
    let main;
    let current_block_type_index;
    let if_block;
    let t2;
    let modal;
    let current;
    let mounted;
    let dispose;
    const if_block_creators = [create_if_block$4, create_else_block$2];
    const if_blocks = [];

    function select_block_type(ctx, dirty) {
      if (
      /*onLine*/
      ctx[2]) return 0;
      return 1;
    }

    current_block_type_index = select_block_type(ctx);
    if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    modal = new Modal({
      props: {
        isOpen:
        /*newRoomModal*/
        ctx[1].isOpen,
        $$slots: {
          default: [create_default_slot$1]
        },
        $$scope: {
          ctx
        }
      }
    });
    return {
      c() {
        div = element("div");
        header = element("header");
        header.innerHTML = `<h1 class="title">Salas recientes</h1>`;
        t1 = space();
        main = element("main");
        if_block.c();
        t2 = space();
        create_component(modal.$$.fragment);
        attr(div, "id", "app");
      },

      m(target, anchor) {
        insert(target, div, anchor);
        append(div, header);
        append(div, t1);
        append(div, main);
        if_blocks[current_block_type_index].m(main, null);
        insert(target, t2, anchor);
        mount_component(modal, target, anchor);
        current = true;

        if (!mounted) {
          dispose = [listen(window, "online",
          /*networkStatus*/
          ctx[5]), listen(window, "offline",
          /*networkStatus*/
          ctx[5])];
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        let previous_block_index = current_block_type_index;
        current_block_type_index = select_block_type(ctx);

        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(ctx, dirty);
        } else {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
          if_block = if_blocks[current_block_type_index];

          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
            if_block.c();
          } else {
            if_block.p(ctx, dirty);
          }

          transition_in(if_block, 1);
          if_block.m(main, null);
        }

        const modal_changes = {};
        if (dirty &
        /*newRoomModal*/
        2) modal_changes.isOpen =
        /*newRoomModal*/
        ctx[1].isOpen;

        if (dirty &
        /*$$scope, newRoomModal*/
        16386) {
          modal_changes.$$scope = {
            dirty,
            ctx
          };
        }

        modal.$set(modal_changes);
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        transition_in(modal.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        transition_out(modal.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        if (detaching) detach(div);
        if_blocks[current_block_type_index].d();
        if (detaching) detach(t2);
        destroy_component(modal, detaching);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function instance$7($$self, $$props, $$invalidate) {
    let data = JSON.parse(localStorage.getItem('blaze'));
    let rooms = data.rooms;
    let newRoomModal = {
      roomName: '',
      isOpen: false
    };
    let onLine = navigator.onLine;

    function removeRoom(room) {
      $$invalidate(0, rooms = rooms.filter(roomName => roomName !== room));
      data = { ...data,
        rooms
      };
      localStorage.setItem('blaze', JSON.stringify(data));
    }

    function joinRoom() {
      const room = newRoomModal.roomName.toLowerCase(); // Close the modal

      $$invalidate(1, newRoomModal.isOpen = false, newRoomModal); // Send the user to that room

      navigate(`/app/t/${room}`);
    }
    /**
    * Update the state when user goes online or offline
    */


    function networkStatus() {
      $$invalidate(2, onLine = navigator.onLine);
    }

    onMount(() => {
      /**
      * Show the new room modal when there are no recent rooms
      */
      if (!rooms.length) $$invalidate(1, newRoomModal.isOpen = true, newRoomModal);
    });

    const click_handler = room => removeRoom(room);

    const click_handler_1 = room => navigate(`/app/t/${room}`);

    const click_handler_2 = () => $$invalidate(1, newRoomModal.isOpen = true, newRoomModal);

    function input_input_handler() {
      newRoomModal.roomName = this.value;
      $$invalidate(1, newRoomModal);
    }

    return [rooms, newRoomModal, onLine, removeRoom, joinRoom, networkStatus, click_handler, click_handler_1, click_handler_2, input_input_handler];
  }

  class Rooms extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$7, create_fragment$7, safe_not_equal, {});
    }

  }
  /* public/views/NewUser.svelte generated by Svelte v3.42.1 */


  function create_fragment$8(ctx) {
    let div;
    let form;
    let input;
    let t0;
    let button;
    let mounted;
    let dispose;
    return {
      c() {
        div = element("div");
        form = element("form");
        input = element("input");
        t0 = space();
        button = element("button");
        button.textContent = "Continuar";
        input.required = true;
        attr(input, "type", "text");
        attr(input, "placeholder", "nickname guay");
        attr(input, "maxlength", "10");
        attr(input, "aria-label", "Pon tu nickname");
        attr(button, "type", "submit");
        attr(button, "class", "wide");
        attr(form, "class", "new-user");
        attr(div, "id", "app");
        attr(div, "class", "center-center");
      },

      m(target, anchor) {
        insert(target, div, anchor);
        append(div, form);
        append(form, input);
        set_input_value(input,
        /*username*/
        ctx[0]);
        append(form, t0);
        append(form, button);

        if (!mounted) {
          dispose = [listen(input, "input",
          /*input_input_handler*/
          ctx[2]), listen(form, "submit", prevent_default(
          /*registerUser*/
          ctx[1]))];
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        if (dirty &
        /*username*/
        1 && input.value !==
        /*username*/
        ctx[0]) {
          set_input_value(input,
          /*username*/
          ctx[0]);
        }
      },

      i: noop,
      o: noop,

      d(detaching) {
        if (detaching) detach(div);
        mounted = false;
        run_all(dispose);
      }

    };
  }

  function instance$8($$self, $$props, $$invalidate) {
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

    function input_input_handler() {
      username = this.value;
      $$invalidate(0, username);
    }

    return [username, registerUser, input_input_handler];
  }

  class NewUser extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$8, create_fragment$8, safe_not_equal, {});
    }

  }
  /* public/App.svelte generated by Svelte v3.42.1 */


  const {
    window: window_1
  } = globals;

  function create_else_block_1(ctx) {
    let rooms;
    let current;
    rooms = new Rooms({});
    return {
      c() {
        create_component(rooms.$$.fragment);
      },

      m(target, anchor) {
        mount_component(rooms, target, anchor);
        current = true;
      },

      p: noop,

      i(local) {
        if (current) return;
        transition_in(rooms.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(rooms.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(rooms, detaching);
      }

    };
  } // (23:4) {#if !registered}


  function create_if_block_1$4(ctx) {
    let newuser;
    let current;
    newuser = new NewUser({});
    newuser.$on("registered",
    /*registered_handler*/
    ctx[2]);
    return {
      c() {
        create_component(newuser.$$.fragment);
      },

      m(target, anchor) {
        mount_component(newuser, target, anchor);
        current = true;
      },

      p: noop,

      i(local) {
        if (current) return;
        transition_in(newuser.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(newuser.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(newuser, detaching);
      }

    };
  } // (22:2) <Route path="/app">


  function create_default_slot_2(ctx) {
    let current_block_type_index;
    let if_block;
    let if_block_anchor;
    let current;
    const if_block_creators = [create_if_block_1$4, create_else_block_1];
    const if_blocks = [];

    function select_block_type(ctx, dirty) {
      if (!
      /*registered*/
      ctx[0]) return 0;
      return 1;
    }

    current_block_type_index = select_block_type(ctx);
    if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    return {
      c() {
        if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if_blocks[current_block_type_index].m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },

      p(ctx, dirty) {
        let previous_block_index = current_block_type_index;
        current_block_type_index = select_block_type(ctx);

        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(ctx, dirty);
        } else {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
          if_block = if_blocks[current_block_type_index];

          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
            if_block.c();
          } else {
            if_block.p(ctx, dirty);
          }

          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if_blocks[current_block_type_index].d(detaching);
        if (detaching) detach(if_block_anchor);
      }

    };
  } // (34:4) {:else}


  function create_else_block$3(ctx) {
    let filetransfer;
    let current;
    filetransfer = new FileTransfer({});
    return {
      c() {
        create_component(filetransfer.$$.fragment);
      },

      m(target, anchor) {
        mount_component(filetransfer, target, anchor);
        current = true;
      },

      p: noop,

      i(local) {
        if (current) return;
        transition_in(filetransfer.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(filetransfer.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(filetransfer, detaching);
      }

    };
  } // (32:4) {#if !registered}


  function create_if_block$5(ctx) {
    let newuser;
    let current;
    newuser = new NewUser({});
    newuser.$on("registered",
    /*registered_handler_1*/
    ctx[3]);
    return {
      c() {
        create_component(newuser.$$.fragment);
      },

      m(target, anchor) {
        mount_component(newuser, target, anchor);
        current = true;
      },

      p: noop,

      i(local) {
        if (current) return;
        transition_in(newuser.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(newuser.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(newuser, detaching);
      }

    };
  } // (31:2) <Route path="/app/t/:room">


  function create_default_slot_1(ctx) {
    let current_block_type_index;
    let if_block;
    let if_block_anchor;
    let current;
    const if_block_creators = [create_if_block$5, create_else_block$3];
    const if_blocks = [];

    function select_block_type_1(ctx, dirty) {
      if (!
      /*registered*/
      ctx[0]) return 0;
      return 1;
    }

    current_block_type_index = select_block_type_1(ctx);
    if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    return {
      c() {
        if_block.c();
        if_block_anchor = empty();
      },

      m(target, anchor) {
        if_blocks[current_block_type_index].m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },

      p(ctx, dirty) {
        let previous_block_index = current_block_type_index;
        current_block_type_index = select_block_type_1(ctx);

        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(ctx, dirty);
        } else {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
          if_block = if_blocks[current_block_type_index];

          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
            if_block.c();
          } else {
            if_block.p(ctx, dirty);
          }

          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      },

      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },

      o(local) {
        transition_out(if_block);
        current = false;
      },

      d(detaching) {
        if_blocks[current_block_type_index].d(detaching);
        if (detaching) detach(if_block_anchor);
      }

    };
  } // (19:0) <Router>


  function create_default_slot$2(ctx) {
    let route0;
    let t;
    let route1;
    let current;
    route0 = new Route({
      props: {
        path: "/app",
        $$slots: {
          default: [create_default_slot_2]
        },
        $$scope: {
          ctx
        }
      }
    });
    route1 = new Route({
      props: {
        path: "/app/t/:room",
        $$slots: {
          default: [create_default_slot_1]
        },
        $$scope: {
          ctx
        }
      }
    });
    return {
      c() {
        create_component(route0.$$.fragment);
        t = space();
        create_component(route1.$$.fragment);
      },

      m(target, anchor) {
        mount_component(route0, target, anchor);
        insert(target, t, anchor);
        mount_component(route1, target, anchor);
        current = true;
      },

      p(ctx, dirty) {
        const route0_changes = {};

        if (dirty &
        /*$$scope, registered*/
        17) {
          route0_changes.$$scope = {
            dirty,
            ctx
          };
        }

        route0.$set(route0_changes);
        const route1_changes = {};

        if (dirty &
        /*$$scope, registered*/
        17) {
          route1_changes.$$scope = {
            dirty,
            ctx
          };
        }

        route1.$set(route1_changes);
      },

      i(local) {
        if (current) return;
        transition_in(route0.$$.fragment, local);
        transition_in(route1.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(route0.$$.fragment, local);
        transition_out(route1.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(route0, detaching);
        if (detaching) detach(t);
        destroy_component(route1, detaching);
      }

    };
  }

  function create_fragment$9(ctx) {
    let router;
    let current;
    let mounted;
    let dispose;
    router = new Router({
      props: {
        $$slots: {
          default: [create_default_slot$2]
        },
        $$scope: {
          ctx
        }
      }
    });
    return {
      c() {
        create_component(router.$$.fragment);
      },

      m(target, anchor) {
        mount_component(router, target, anchor);
        current = true;

        if (!mounted) {
          dispose = listen(window_1, "offline",
          /*handleOffline*/
          ctx[1]);
          mounted = true;
        }
      },

      p(ctx, [dirty]) {
        const router_changes = {};

        if (dirty &
        /*$$scope, registered*/
        17) {
          router_changes.$$scope = {
            dirty,
            ctx
          };
        }

        router.$set(router_changes);
      },

      i(local) {
        if (current) return;
        transition_in(router.$$.fragment, local);
        current = true;
      },

      o(local) {
        transition_out(router.$$.fragment, local);
        current = false;
      },

      d(detaching) {
        destroy_component(router, detaching);
        mounted = false;
        dispose();
      }

    };
  }

  function instance$9($$self, $$props, $$invalidate) {
    let registered = Boolean(window.localStorage.getItem('blaze'));

    function handleOffline() {
      if (navigator.onLine) return; // Redirect user to home page when user goes offline

      navigate('/app', {
        replace: true
      });
    }

    const registered_handler = () => $$invalidate(0, registered = true);

    const registered_handler_1 = () => $$invalidate(0, registered = true);

    return [registered, handleOffline, registered_handler, registered_handler_1];
  }

  class App extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$9, create_fragment$9, safe_not_equal, {});
    }

  }

  const app = new App({
    target: document.body
  });
  /**
   * Register service worker in the /app scope
   */

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/app'
    }).then(() => {
      console.log('SW registered');
    });
  }

  return app;
}();