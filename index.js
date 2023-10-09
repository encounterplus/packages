'use strict'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import fetch from 'node-fetch'

// const BASE_URL = "http://192.168.1.134:8080/";
const BASE_URL = "https://packages.encounter.plus";

function loadData(dir, type) {
    let data = [];
    
    try {
        fs.readdirSync(dir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory()).forEach(dirent => {
            let name = dirent.name

            // get file path
            let file = path.join(dir, name, name + ".yaml")
    
            // load yaml content from file
            let fileContents = fs.readFileSync(file, 'utf8');
            let model = yaml.load(fileContents);
            model.path = path.join(dir, name);
            model.type = type;

            // push to data array
            data.push(model)
        });
    
        return data;
    
    } catch (e) {
        console.error(e);
        return data;
    }
}

async function downloadManifest(url) {
    console.log(`downloading manifest: ${url}`)

    try {
        const response = await fetch(url);
        if(!response.ok) {
            console.error('invalid response');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

function createPackage(definition, manifest) {
    // create new package
    let pkg = new Object();
    pkg.id = definition.id;
    pkg.name = definition.name;
    pkg.type = definition.type;
    pkg.content = definition.content;
    pkg.repository = definition.repository;

    pkg.description = manifest.description
    pkg.category = manifest.category;
    
    pkg.version = manifest.version;
    pkg.download = manifest.download;

    pkg.website = manifest.website;

    if(definition.authors) {
        pkg.authors = definition.authors;
    } else {
        manifest.authors;
    }
   
    return pkg;
}

const main = async () => {
    let systemData = loadData("./systems/", "system");
    let moduleData = loadData("./modules/", "module");

    let definitions = systemData.concat(moduleData);

    let distPath = path.join(".", "dist")
    
    // // clear dist directory
    // if(fs.existsSync(distPath)) {
    //     fs.DirentrmSync(distPath, { recursive: true, force: true });
    // }
    
    // console.log(systemData);

    let packages = [];

    for (const definition of definitions) {
        console.log(`processing: ${definition.name}`)

        // download manifest
        let manifest = await downloadManifest(definition.package);
        
        // check manifest properties
        if(manifest == null || !manifest.version || !manifest.download ) {
            continue;
        }

        // console.debug(manifest);

        // create package from definition and manifest
        let pkg = createPackage(definition, manifest);

        // copy media
        let media = [];
        if (definition.media) {
            for(let image of definition.media) {
                let imagePath = path.join(definition.path, image);

                let distPath = path.join("./dist/assets/", definition.path);

                // create dist directory
                if(!fs.existsSync(distPath)) {
                    fs.mkdirSync(distPath, { recursive: true } );
                }

                fs.copyFileSync(imagePath, path.join(distPath, image));

                media.push(path.join(BASE_URL, "assets", imagePath));
            }
        }
        pkg.media = media;

        // push final package
        packages.push(pkg)
    }

    // create json data from packages
    let jsonData = JSON.stringify(packages, null, 2);

    console.log(packages);

    // create dist directory
    if(!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath);
    }

    fs.writeFileSync(path.join(".", "dist", "packages.json"), jsonData)
    console.log('JSON data is saved.')

    fs.copyFileSync(path.join(".", "CNAME"), path.join(".", "dist", "CNAME"))
    console.log('CNAME copied.')

    // copy assets to dist
    // copyRecursiveSync("./assets/", "./dist/assets/");

    console.log("finished");
}

/**
 * Look ma, it's cp -R.
 * @param {string} src  The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
 var copyRecursiveSync = function(src, dest) {
    var exists = fs.existsSync(src);
    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      fs.mkdirSync(dest);
      fs.readdirSync(src).forEach(function(childItemName) {
        copyRecursiveSync(path.join(src, childItemName),
                          path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

main();
