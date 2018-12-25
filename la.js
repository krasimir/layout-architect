(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
  } else {
    root.LayoutArchitect = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return function (rootContainer, allBlocks, initialState) {
    if (!rootContainer) throw new Error('Please provide a HTML element as first argument!');
    if (!allBlocks) throw new Error('Please provide a list of strings as a second argument!');

    const $ = tag => document.createElement(tag);
    const $a = (e, attr, value) => e.setAttribute(attr, value);
    const blocks = filterBlocksBasedOnTheInitialState();
    const laContainer = $('DIV');
    const listeners = [];
    let state = initialState || null;
    let selectedCallback;

    $a(laContainer, 'class', 'la');

    function filterBlocksBasedOnTheInitialState() {
      const all = allBlocks.slice();

      if (!initialState) return all;
      const foundInTree = (function parseEl(found, item) {
        if (item.elements.length === 0) {
          found.push(item.name);
        } else {
          item.elements.forEach(i => parseEl(found, i));
        }
        return found;
      })([], initialState);

      return all.filter(i => foundInTree.indexOf(i) === -1);
    }
    function createBlock(name) {
      return { name: name, elements: [] }
    }
    function addItem(item, direction, where) {
      return selectBlock().then(blockName => createBlock(blockName)).then(block => {
        if (item.elements.length === 0) {
          item.direction = direction;
          item.elements = where === 'after' ? [
            createBlock(item.name),
            block
          ] : [
            block,
            createBlock(item.name)
          ];
          delete item.name;
        } else {
          if (item.direction !== direction) {
            const oldElements = {
              direction: item.direction,
              elements: item.elements
            }
            item.elements = where === 'after' ?
              [ oldElements, block ] :
              [ block, oldElements ]
          } else {
            where === 'after' ?
              item.elements.push(block) :
              item.elements = [block].concat(item.elements);
          }
          item.direction = direction;
        }
      })      
    }
    function removeItem(parent, item) {
      if (!parent) {
        state = null;
        if (blocks.indexOf(item.name) === -1) {
          blocks.push(item.name);
        }
        return;
      }

      const index = parent.elements.findIndex(i => i === item);
      if (index > -1) {
        parent.elements.splice(index, 1);
        if (parent.elements.length === 1) {
          if (parent.elements[0].elements.length > 0) {
            parent.direction = parent.elements[0].direction; 
            parent.elements = parent.elements[0].elements;
          } else {
            parent.name = parent.elements[0].name;
            parent.elements = [];
            delete parent.direction;
          }
        }
        blocks.push(item.name);
      }
    }
    function addLinks(container, operations, item, parent) {
      return operations.map(linkData => {
        const a = $('A');
        $a(a, 'data-op', linkData[0]);
        $a(a, 'href', 'javascript:void(0);');
        $a(a, 'class', linkData[2]);
        a.innerHTML = linkData[1];
        a.item = item;
        a.parent = parent;
        return a;
      }).forEach(link => container.appendChild(link));
    }
    function renderItem(item, parent) {
      const e = $('DIV');

      $a(e, 'class', 'la-block');
      if (item.elements.length === 0) {
        e.innerHTML = '<div class="la-name">' + item.name + '</div>';
        addLinks(e, [ ['remove', '<svg width="14" height="14" viewBox="0 0 1792 1792"><path d="M1490 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z"/></svg>', 'la-remove'], ], item, parent);
      } else {
        e.innerHTML = '<div class="la-children" style="grid-template-' + (item.direction === 'vertical' ? 'rows' : 'columns') + ': repeat(' + item.elements.length + ', 1fr);"></div>';
        item.elements.forEach(i => e.querySelector('.la-children').appendChild(renderItem(i, item)))
      }
      addLinks(e, [
        ['horizontal:left', '', 'la-left'],
        ['vertical:top', '', 'la-top'],
        ['vertical:bottom', '', 'la-bottom'],
        ['horizontal:right', '', 'la-right']
      ], item, parent);
      return e;
    }
    function createBlockSelector() {
      const e = $('DIV');
      blocks.forEach(blockName => {
        const link = $('A');
        $a(link, 'href', 'javascript:void(0);');
        $a(link, 'data-op', 'select');
        link.item = blockName;
        link.innerHTML = '<svg width="10" height="10" viewBox="0 0 1792 1792"><path d="M1600 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z"/></svg> ' + blockName;
        e.appendChild(link);
      });
      $a(e, 'class', 'la-selector');
      return e;
    }
    function selectBlock() {
      render(createBlockSelector(laContainer));
      return new Promise(done => {
        selectedCallback = blockName => {
          const index = blocks.indexOf(blockName);
          if (index > -1) {
            blocks.splice(index, 1);
          }
          done(blockName);
        };
      });
    }
    function render(content) {
      content = content ? content : renderItem(state);
      while (laContainer.firstChild) { laContainer.removeChild(laContainer.firstChild); }
      laContainer.appendChild(content);
    }
    function notify() {
      listeners.forEach(l => l(state));
    }
    function selectInitialBlock() {
      selectBlock().then(blockName => {
        state = createBlock(blockName);
        render();
        notify();
      });
    }

    laContainer.addEventListener('click', event => {
      let operation = event.target.getAttribute('data-op');
      const item = event.target.item;
      const parent = event.target.parent;

      if (operation && item) {
        if (operation === 'remove') {
          removeItem(parent, item);
          if (state) {
            render();
          } else {
            selectInitialBlock();
          }
          notify();
        } else if (operation === 'select') {
          selectedCallback(item);
        } else {
          if (blocks.length === 0) return;
          operation = operation.split(':');
          addItem(item, operation[0], operation[1] === 'right' || operation[1] === 'bottom' ? 'after' : 'before').then(() => {
            render();
            notify();
          });
        }
      }
    });

    state ? render() : selectInitialBlock();

    rootContainer.appendChild(laContainer);

    return {
      onChange: cb => {
        listeners.push(cb);
      },
      change: newState => {
        state = newState;
        render();
      },
      get() {
        return state;
      }
    }
  };
}));