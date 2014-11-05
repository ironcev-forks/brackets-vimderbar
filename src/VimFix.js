/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50*/
/*global define, $, brackets, setTimeout*/

// this function's purpose is to make CodeMirror's vim keymap play nice with
// Brackets.
define(function (require, exports) {
    "use strict";

    var CodeHintManager = brackets.getModule("editor/CodeHintManager"),
        CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        CommandManager = brackets.getModule("command/CommandManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        MainViewManager = brackets.getModule("view/MainViewManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        Commands = brackets.getModule("command/Commands"),
        commandDone = false,
        CommandDialog,
        cm;

    /**
     * @private
     * Handler for CodeMirror's vim.js vim-keypress event. Filters and updates keys, clears commands when next command input.
     * @param {String} key Key pressed.
     */
    function onKeypress(key) {
        if (key === "/" || key === ":" || key === "?" || key === "u") {
            return;
        }
        cm.updateVimCommandKeys(key);
    }
    /**
     * @private
     * Handler for CodeMirror's vim.js vim-command-done event. Sets commandDone so current command is cleared on next keypress.
     */
    function onCommandDone() {
        cm.clearVimCommandKeys();
    }
    /**
     * @private
     * Close inline editor when esc is pressed outside of insert/replace mode.
     * @param {CodeMirror} cm Current CodeMirror instance.
     * @param {jQuery.Event} e KeyEvent event object.
     */
    function escKeyEvent(cm, e) {
        if (e.keyCode === 27) {
            var currentFullEditor = EditorManager.getCurrentFullEditor();
            var activeEditor = EditorManager.getActiveEditor();
            CodeMirror.e_stop(e);
            if (currentFullEditor !== activeEditor && !cm.state.vim.insertMode && !cm.state.vim.visualMode) {
                CodeMirror.commands.close(cm);
            }
        }
    }
    /**
     * Attach events to current CodeMirror instance.
     * @param {CodeMirror} cm Current CodeMirror instance.
     */
    function attachVimderbar(cm) {
        cm.off("keydown", escKeyEvent);
        cm.on("keydown", escKeyEvent);
        cm.off("vim-keypress", onKeypress);
        cm.on("vim-keypress", onKeypress);
        cm.off("vim-command-done", onCommandDone);
        cm.on("vim-command-done", onCommandDone);
    }
    /**
     * Initialize Vim fixes for CodeMirror -> Brackets integration.
     * @param {CodeMirror} _cm Current CodeMirror instance.
     * @param {CommandDialog} _CommandDialog Current CommandDialog instance.
     */
    function init(_cm, _CommandDialog) {
        CommandDialog = _CommandDialog;
        cm = _cm;

        attachVimderbar(cm);
        // CodeMirror -> Brackets Command Hooks
        CodeMirror.commands.save = function () {
            CommandManager.execute("file.save");
        };
        CodeMirror.commands.close = function () {
            var hostEditor = EditorManager.getCurrentFullEditor(),
                inlineFocused = EditorManager.getFocusedInlineWidget();
            if (inlineFocused) {
                // inline editor exists & is in focus. close it.
                EditorManager.closeInlineWidget(hostEditor, inlineFocused);
            } else {
                // no inline editor is in focus so just close the document.
                CommandManager.execute("file.close");
            }
        };
        CodeMirror.commands.open = function (name) {
            // used to be "file.open" because quickOpen would automatically close
            // following the user's push of Enter key to submit Open command (":e[Enter]")
            // setTimeout meant to give the user a moment to let go of the Enter key.
            setTimeout(function () {
                CommandManager.execute("navigate.quickOpen");
            }, 150);
        };

        // Ex Command Definitions
        CodeMirror.Vim.defineEx("quit", "q", function (cm) {
            cm.focus();
            CodeMirror.commands.close(cm);
        });
        CodeMirror.Vim.defineEx("edit", "e", function (cm) {
            CodeMirror.commands.open();
        });
        CodeMirror.Vim.defineEx("write", "w", function (cm) {
            CodeMirror.commands.save(cm);
        });
        CodeMirror.Vim.defineEx("bnext", "bn", function (cm) {
            CommandManager.execute(Commands.CMD_OPEN, { fullPath: MainViewManager.traverseToNextViewByMRU(1).file._path });
        });
        CodeMirror.Vim.defineEx("bprev", "bp", function (cm) {
            CommandManager.execute(Commands.CMD_OPEN, { fullPath: MainViewManager.traverseToNextViewByMRU(-1).file._path });
        });
        CodeMirror.Vim.defineEx("vsplit", "vs", function (cm) {
            CommandManager.execute(Commands.CMD_SPLITVIEW_VERTICAL);
        });
        CodeMirror.Vim.defineEx("split", "sp", function (cm) {
            CommandManager.execute(Commands.CMD_SPLITVIEW_HORIZONTAL);
        });
        CodeMirror.Vim.defineEx("only", "on", function (cm) {
            CommandManager.execute(Commands.CMD_SPLITVIEW_NONE);
        });
        CodeMirror.Vim.defineEx("clearhistory", "clearhistory", function (cm) {
            CommandDialog.resetHistory();
            cm.focus();
        });
    }

    exports.init = init;
    exports.attachVimderbar = attachVimderbar;
});
