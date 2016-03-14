var isArray = Array.isArray || function (object) {
        return object instanceof Array;
    };

var isObject = isObject || function (value) {
        return (typeof value == "object") && (value !== null);
    };

var isString = isString || function (value) {
        return (typeof value == 'string' || value instanceof String);
    };

var isFunction = isFunction || function (value) {
        return (typeof value == 'function');
    };


var Stack = function () {
    var array = [];
    for (var i = 0; i < arguments.length; i++) {
        array.push(arguments[i]);
    }
    var stack = {};
    stack.push = function (element) {
        array.push(element);
        return stack;
    };
    stack.pop = function () {
        return array.pop();
    };
    stack.peek = function () {
        var length = array.length;
        if (length) {
            return array[length - 1];
        }
    };
    stack.size = function () {
        return array.length;
    };
    stack.get = function (index) {
        return array[index];
    };
    stack.isEmpty = function () {
        return !array.length;
    };
    return stack;
};


var indexOf = function (array, predicate) {
    for (var i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
};

var indexOfElement = function (array, element) {
    for (var i = 0; i < array.length; i++) {
        var current = array[i];
        if (current == element) {
            return i;
        }
    }
    return -1;
};

var indexOfEqual = function (array, element) {
    for (var i = 0; i < array.length; i++) {
        if (equals(element, array[i])) {
            return i;
        }
    }
    return -1;
};

var getElement = function (array, predicate) {
    var index = indexOf(array, predicate);
    if (index >= 0) return array[index];
};

var remove = function (array, predicate) {
    var index = indexOf(array, predicate);
    if (index >= 0) {
        var element = array[index];
        array.splice(index, 1);
        return element;
    }
};

var removeElement = function (array, element) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === element) {
            array.splice(i, 1);
            return true;
        }
    }
    return false;
};

var removeEqual = function (array, element) {
    for (var i = 0; i < array.length; i++) {
        if (equals(element, array[i])) {
            array.splice(i, 1);
            return true;
        }
    }
    return false;
};

var contains = function (array, element) {
    return indexOfElement(array, element) >= 0;
};

var LruCache = function (maxWeight) {
    var cache = {};
    cache.weigh = function (/*key, value*/) {
        return 1;
    };
    cache.onDismiss = function (/*key, value*/) {
        //NOOP;
    };
    var currentWeight = 0;
    var list = LinkedList();
    var map = {};
    cache.get = function (key) {
        if (key in map) {
            var node = map[key];
            list.removeNode(node);
            list.addNode(node);
            return node.element.value;
        }
        return undefined;
    };
    cache.getSilently = function (key) {
        if (key in map) {
            var node = map[key];
            return node.element.value;
        }
        return undefined;
    };
    cache.put = function (key, value, doShrink) {
        var newElement = {key: key, value: value};
        var newNode = list.add(newElement);
        if (key in map) {
            remove(key);
        }
        map[key] = newNode;
        currentWeight += cache.weigh(key, value);
        if (doShrink) cache.shrink();
        return newNode;
    };
    cache.shrink = function () {
        while (currentWeight > maxWeight) {
            var nodeToDismiss = list.nodeFromTail(notPinned);
            if (nodeToDismiss == null) break;
            removeNode(nodeToDismiss);
        }
    };
    var notPinned = function (node) {
        var element = node.element;
        return !element.pinned;
    };
    cache.forEach = list.forEach;
    var remove = function (key) {
        var node = map[key];
        removeNode(node);
    };
    var removeNode = function (node) {
        list.removeNode(node);
        var key = node.element.key;
        var value = node.element.value;
        currentWeight -= cache.weigh(key, value);
        delete map[key];
        cache.onDismiss(key, value);
    };
    return cache;
};

var LinkedList = function () {
    var list = {};
    var head = null;
    var tail = null;
    list.add = function (element) {
        var node = {previous: null, next: null, element: element};
        list.addNode(node);
        return node;
    };
    list.remove = function (element) {
        var node = findNode(element);
        if (node != null) {
            list.removeNode(node);
        }
    };
    list.forEach = function (handle) {
        var current = head;
        while (current != null) {
            handle(current.element);
            current = current.next;
        }
    };
    list.nodeFromTail = function (predicate) {
        var current = tail;
        while (current != null) {
            if (predicate(current)) {
                return current;
            }
            current = current.previous;
        }
        return null;
    };
    list.nodeFromHead = function (predicate) {
        var current = head;
        while (current != null) {
            if (predicate(current)) {
                return current;
            }
            current = current.next;
        }
        return null;
    };
    var findNode = function (element) {
        var current = head;
        while (current != null && current.element != element) {
            current = current.next;
        }
        return current;
    };
    list.addNode = function (node) {
        if (head === null) {
            head = node;
            tail = node;
        } else {
            node.next = head;
            head.previous = node;
            head = node;
        }
    };
    list.removeNode = function (node) {
        var previous = node.previous;
        var next = node.next;
        if (previous != null) {
            previous.next = next;
        }
        if (next != null) {
            next.previous = previous;
        }
        if (head == node) {
            head = next;
        }
        if (tail == node) {
            tail = node.previous;
        }
    };
    list.print = function () {
        var current = head;
        var result = "";
        while (current != null) {
            result = result + ";";
            result = result + current.element;
            current = current.next;
        }
        return result;
    };
    return list;
};


var MultiMap = function () {
    var map = {};
    return {
        put: function (id, element) {
            var list = map[id];
            if (!list) {
                list = [];
                map[id] = list;
            }
            list.push(element);
        },
        forEach: function (id, handle) {
            if (arguments.length==2) {
                var list = map[id];
                return list && list.forEach(handle);
            }
            for (id in map) {
                map[id].forEach(handle);
            }
        },
        remove: function (id, element) {
            var list = map[id];
            if (element) {
                removeElement(list, element);
                if (!list.length) delete map[id];
            } else {
                delete map[id];
                return list || [];
            }
        }
    };
};


var equals = function (a, b) {
    if (a === b) return true;
    if (isArray(a)) {
        if (!isArray(b) || b.length != a.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (!equals(a[i], b[i])) return false;
        }
        return true;
    } else if (a instanceof Date) {
        if (!b instanceof Date) return false;
        return a.getTime() == b.getTime();
    } else if (isObject(a)) {
        if (!isObject(b)) return false;
        for (var key in a) {
            if (!(key in b) || !equals(a[key], b[key])) return false;
        }
        return true;
    }
    return a == b;
};

var clone = function (value) {
    var theClone, clonedValue;
    if (isArray(value)) {
        theClone = [];
        for (var i = 0; i < value.length; i++) {
            clonedValue = clone(value[i]);
            theClone.push(clonedValue);
        }
        return theClone;
    } else if (isObject(value)) {
        if ('clone' in value) {
            return value.clone();
        }
        theClone = {};
        for (var key in value) {
            clonedValue = clone(value[key]);
            theClone[key] = clonedValue;
        }
        return theClone;
    }
    return value;
};


var startsWith = function (string, prefix) {
    return string.length >= prefix.length
        && string.substr(0, prefix.length) === prefix;
};

var forEach = function (value, callback) {
    if (!value) return;
    var length = value.length;
    if (length) {
        for (var i = 0; i < length; i++) {
            var element = value[i];
            callback(element, i);
        }
    }
};

var murmurHash = function (i) {
    i ^= i >>> 16;
    i *= 0x85ebca6b;
    i ^= i >>> 13;
    i *= 0xc2b2ae35;
    i ^= i >>> 16;
    return i;
};

var extend = function (parent, child) {
    for (var key in parent) {
        if (!(key in child)) {
            child[key] = parent[key];
        }
    }
    return child;
};

var toHarmlessString = function (name, maxLength) {
    var size = Math.min(name.length, maxLength || 10);
    name = name.toLowerCase();
    var fileName = '';
    for (var i = 0; i < size; i++) {
        var charCode = name.charCodeAt(i);
        if (97 <= charCode && charCode <= 122
            || 48 <= charCode && charCode <= 57) {
            fileName += name[i];
        } else {
            fileName += '_';
        }
    }
    return fileName;
};

var getRootFolder = function () {
    var path = __dirname.split('/');
    path.pop();
    path.pop();
    return path.join('/') + '/';
};

var allowed = 'abcdefghijklmnopqrstuvwxyz0123456789';
var createRandomId = function (length) {
    var id = '';
    for (var i = 0; i < length; i++) {
        var index = Math.floor(Math.random() * allowed.length);
        id += allowed[index];
    }
    return id;
};

var run = function (code) {
    code();
};

var runAll = function (array) {
    array.forEach(run);
};


var createFuture = function () {

    var value, failure;
    var isDone, hasFailed;
    var onDone, onFailed;

    var timeout;

    var callback = function () {
        if (isDone) {
            timeout = timeout || setTimeout(function () {
                    timeout = null;
                    if (hasFailed) {
                        onFailed && onFailed(failure);
                    } else {
                        onDone && onDone(value);
                    }
                }, 0);
        }
        return future;
    };

    var future = {
        set: function ($value) {
            value = $value;
            isDone = true;
            hasFailed = false;
            callback();
        },
        fail: function ($failure) {
            failure = $failure;
            isDone = true;
            hasFailed = true;
            callback();
        },
        onDone: function (handler) {
            onDone = handler;
            return callback();
        },
        onFailed: function (handler) {
            onFailed = handler;
            return callback();
        }
    };

    return future;
}


var delayedCode = function (code) {

    var isRunning = false;
    var runAgain = false;

    var onDone = function () {
        isRunning = false;
        if (runAgain) {
            runAgain = false;
            run();
        }
    };

    var run = function () {
        if (isRunning) return (runAgain = true);
        isRunning = true;
        code(onDone);
    };

    return run;

};

module.exports = {
    future: createFuture,
    contains: contains,
    forEach: forEach,
    clone: clone,
    getElement: getElement,
    indexOf: indexOf,
    indexOfElement: indexOfElement,
    indexOfEqual: indexOfEqual,
    remove: remove,
    removeElement: removeElement,
    removeEqual: removeEqual,
    equals: equals,
    murmurHash: murmurHash,
    startsWith: startsWith,
    LruCache: LruCache,
    LinkedList: LinkedList,
    MultiMap: MultiMap,
    Stack: Stack,
    extend: extend,
    toHarmlessString: toHarmlessString,
    getRootFolder: getRootFolder,
    randomId: createRandomId,
    runAll: runAll,
    delayedCode: delayedCode
};