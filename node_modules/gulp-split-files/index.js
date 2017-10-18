/*jslint node: true*/

"use strict";

var through2 = require("through2"),
    File = require('vinyl'),
    path = require("path"),

    splitFiles = {
        fileNameRegExpObj: {
            start: "\\/\\*splitfilename=",
            end: "\\*\\/",
            filename: "([\\w\\.\\-]+)"
        },
        getFileNameRegExp: function () {
            var fnreo = splitFiles.fileNameRegExpObj;

            return new RegExp(fnreo.start + fnreo.filename + fnreo.end, "g");
        },
        removeNewFileNameFromFileContent: function (newFileContent) {
            var fileNameRegExp = splitFiles.getFileNameRegExp();

            return newFileContent.replace(fileNameRegExp, "").trim();
        },
        removeNewFileNameComment: function (fileNameStr) {
            var fnreo = splitFiles.fileNameRegExpObj,
                removeNewFileNameCommentRe = new RegExp("(" + fnreo.start + "|" + fnreo.end + ")", "g");

            return fileNameStr.replace(removeNewFileNameCommentRe, "");
        },
        getNewFileName: function (newFileContent) {
            var fileNameRegExp = splitFiles.getFileNameRegExp(),
                checkFileName = newFileContent.match(fileNameRegExp);

            return checkFileName ? splitFiles.removeNewFileNameComment(checkFileName.join()).trim() : "";
        },
        getFileBasePath: function (file) {
            return path.basename(file.path);
        },
        getFileNameByIndex: function (file, index) {
            var fileTypeRe = /\.[a-zA-Z1-9]+$/g,
                filePath = splitFiles.getFileBasePath(file),
                fileType = filePath.match(fileTypeRe).join(),
                fileName = filePath.replace(fileTypeRe, "");

            return fileName + "-" + index + fileType;
        },
        getFilePath: function (file, index, newFileContent) {
            return splitFiles.getNewFileName(newFileContent) || splitFiles.getFileNameByIndex(file, index);
        },
        getCreateFileOptions: function (file, index, newFileContent, trimmedNewFileContent) {
            return {
                path: splitFiles.getFilePath(file, index, newFileContent),
                contents: new Buffer(trimmedNewFileContent)
            };
        },
        createNewFile: function (stream, file, newFileContent, index) {
            var trimmedNewFileContent = splitFiles.removeNewFileNameFromFileContent(newFileContent),
                createFileOptions = splitFiles.getCreateFileOptions(file, index, newFileContent, trimmedNewFileContent);

            stream.push(new File(createFileOptions));
        },
        createNewFiles: function (stream, file, newFiles) {
            newFiles.forEach(function (newFileContent, index) {
                splitFiles.createNewFile(stream, file, newFileContent, index);
            });
        },
        actions: {
            pass: function (stream, file) {
                stream.push(file);
            },
            split: function (stream, file, newFiles) {
                splitFiles.createNewFiles(stream, file, newFiles);
            }
        },
        split: function (file, encoding, callback) {
            var contents = file.contents.toString(encoding),
                newFiles = contents.split("/*split*/"),
                stream = this,
                action = (newFiles.length === 1) ? 'pass' : 'split';

            splitFiles.actions[action](stream, file, newFiles);

            callback();
        }
    };

module.exports = function () {
    return through2.obj(splitFiles.split);
};