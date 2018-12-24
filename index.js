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

    const blocks = allBlocks.slice();
    const laContainer = document.createElement('DIV');
    let state = initialState || null;
    let selectedCallback;

    laContainer.setAttribute('class', 'la');

    function createBlock(name) {
      return { name: name, elements: [] }
    }
    function addItem(item, where) {
      return selectBlock().then(blockName => createBlock(blockName)).then(block => {
        if (item.elements.length === 0) {
          item.elements = where === 'after' ? [
            createBlock(item.name),
            block
          ] : [
            block,
            createBlock(item.name)
          ];
          delete item.name;
        } else {
          where === 'after' ?
            item.elements.push(block) :
            item.elements = [block].concat(item.elements);
        }
      })      
    }
    function removeItem(parent, item) {
      const index = parent.elements.findIndex(i => i === item);
      
      if (index > -1) {
        parent.elements.splice(index, 1);
        if (parent.elements.length === 1) {
          parent.name = parent.elements[0].name;
          parent.elements = [];
          delete parent.direction;
        }
        blocks.push(item.name);
      }
    }
    function addLinks(container, operations, item, parent, insertBefore) {
      return operations.map(linkData => {
        const a = document.createElement('A');
        a.setAttribute('data-op', linkData[0]);
        a.setAttribute('href', 'javascript:void(0);');
        a.innerHTML = linkData[1];
        a.item = item;
        a.parent = parent;
        return a;
      }).forEach(link => insertBefore ? container.insertBefore(link, container.firstChild) : container.appendChild(link));
    }
    function renderItem(item, parent) {
      const e = document.createElement('DIV');

      e.setAttribute('class', 'la-block');
      if (item.elements.length === 0) {
        e.innerHTML = '<div class="la-name">' + item.name + '</div>';
        parent && addLinks(e, [ ['remove', 'X'], ], item, parent, true);
      } else {
        e.innerHTML = '<div class="la-children" style="grid-template-' + (item.direction === 'horizontal' ? 'rows' : 'columns') + ': repeat(' + item.elements.length + ', 1fr);"></div>';
        item.elements.forEach(i => e.querySelector('.la-children').appendChild(renderItem(i, item)))
      }
      blocks.length > 0 && addLinks(e, [
        ['vertical:left', '&#8592;'], // ←
        ['horizontal:top', '&#8593;'], // ↑
        ['horizontal:bottom', '&#8595;'], // ↓
        ['vertical:right', '&#8594;'] // →
      ], item, parent);
      return e;
    }
    function createBlockSelector() {
      const e = document.createElement('DIV');
      blocks.forEach(blockName => {
        const link = document.createElement('A');
        link.setAttribute('href', 'javascript:void(0);');
        link.setAttribute('data-op', 'select');
        link.item = blockName;
        link.innerHTML = blockName;
        e.appendChild(link);
      });
      e.setAttribute('class', 'la-selector');
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

    laContainer.addEventListener('click', event => {
      let operation = event.target.getAttribute('data-op');
      const item = event.target.item;
      const parent = event.target.parent;

      if (operation && item) {
        if (operation === 'remove') {
          removeItem(parent, item);
          render();
        } else if (operation === 'select') {
          selectedCallback(item);
        } else {
          operation = operation.split(':');
          item.direction = operation[0];
          addItem(item, operation[1] === 'right' || operation[1] === 'bottom' ? 'after' : 'before').then(render);
        }
      }
    });

    selectBlock().then(blockName => {
      state = createBlock(blockName);
      render();
    });

    rootContainer.appendChild(laContainer);
  };
}));