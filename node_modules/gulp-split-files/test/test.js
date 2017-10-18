/*jslint node: true*/
/*global describe, it, before*/

"use strict";

var splitFiles = require("../index"),

    path = require("path"),
    File = require('vinyl'),
    assert = require("assert"),

    testUtil = {
        createFakeFile: function (fileName, fileContent) {
            return new File({
                path: fileName,
                contents: new Buffer(fileContent)
            });
        },
        getTestSplit: function (fileName, fileContent) {
            var fakeFile = testUtil.createFakeFile(fileName, fileContent),
                split = splitFiles();

            split.write(fakeFile);

            return split;
        }
    };

describe("Simple split", function () {

    var testFile = "testfile1",
        fileName = testFile + ".txt",
        fileContent = "first/*split*/second",
        newfileNames = [testFile + "-0.txt", testFile + "-1.txt"],
        fileCount = 0,
        fileStream = fileContent.split("/*split*/");

    describe("Should split the file '" + fileName + "' in two new files.", function () {
        it("should deliver a file stream containing two files (" + newfileNames.join(" & ") + ")", function (done) {

            var split = testUtil.getTestSplit(fileName, fileContent);

            split.on("data", function (file) {
                var filename = path.basename(file.path);

                assert(file.isBuffer());
                assert.equal(filename, newfileNames[fileCount]);
                assert.equal(file.contents.toString('utf8'), fileStream[fileCount]);

                fileCount += 1;

                if (fileCount === fileStream.length) {
                    done();
                }
            });
        });
    });

    describe("If the split only generates one file skip the file count number suffix", function () {
        it("Should not add a number suffix to the filename if the split results in only one file", function (done) {
            var noSpitFileName = "noSplit.txt",
                noSplitFileContent = "no split",
                split = testUtil.getTestSplit(noSpitFileName, noSplitFileContent);

            split.on("data", function (file) {
                var filename = path.basename(file.path);

                assert(file.isBuffer());
                assert.equal(filename, noSpitFileName);
                assert.equal(file.contents.toString('utf8'), noSplitFileContent);

                fileCount += 1;

                if (fileCount >= 1) {
                    done();
                }
            });
        });
    });

});

describe("Named split", function () {

    var testFile = "testfile2",
        fileName = testFile + ".txt",
        fileContent = "/*splitfilename=first.txt*/first/*split*//*splitfilename=second.txt*/second",
        newFileContent = ["first", "second"],
        newfileNames = ["first.txt", "second.txt"],
        fileCount = 0,
        fileStream = fileContent.split("/*split*/");

    describe("Split '" + fileName + "' into two new files", function () {
        it("Should deliver a file stream containing two files (" + newfileNames.join(" & ") + ")", function (done) {

            fileCount = 0;

            var split = testUtil.getTestSplit(fileName, fileContent);

            split.on("data", function (file) {
                var filename = path.basename(file.path);

                assert(file.isBuffer());
                assert.equal(filename, newfileNames[fileCount]);

                fileCount += 1;

                if (fileCount === fileStream.length) {
                    done();
                }
            });
        });

        it("Should remove the splitfilename comment from the new files", function (done) {

            fileCount = 0;

            var split = testUtil.getTestSplit(fileName, fileContent);

            split.on("data", function (file) {

                assert(file.isBuffer());
                assert.equal(file.contents.toString('utf8'), newFileContent[fileCount]);

                fileCount += 1;

                if (fileCount === fileStream.length) {
                    done();
                }
            });
        });
    });

});

describe("Mixed split", function () {

    var testFile = "testfile3",
        fileName = testFile + ".txt",
        fileContent = "/*splitfilename=first.txt*/first/*split*/second/*split*//*splitfilename=third.txt*/third",
        newfileNames = ["first.txt", testFile + "-1.txt", "third.txt"],
        fileCount = 0,
        fileStream = fileContent.split("/*split*/");

    describe("Split '" + fileName + "' into three new files", function () {
        it("Should deliver a file stream containing three files (" + newfileNames.join(" & ") + ")", function (done) {

            fileCount = 0;

            var split = testUtil.getTestSplit(fileName, fileContent);

            split.on("data", function (file) {
                var filename = path.basename(file.path);

                assert(file.isBuffer());
                assert.equal(filename, newfileNames[fileCount]);

                fileCount += 1;

                if (fileCount === fileStream.length) {
                    done();
                }
            });
        });

    });

});