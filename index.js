import FileChooser from './ui/FileChooser.vue'
import JSZip from 'jszip'
import DropboxService from '../services/DropboxService'
import { gaEvent, saveFile } from '../services/Utils'


export default {
  name: 'ZipFolder',
  props: {
    dropFiles: Object
  },
  components: {
    FileChooser    
  },
  data() {
       return {
         loading: false,
         done: false,
         zipFile: new JSZip(),
         fileSaved: false,
         processingActive: false,
         fileList: [],
         processedFiles: false,
         zipBlob: null,
         zipProgress: 0,
         currentFile: '',
         compressionLevel: 9,
         dropboxFolder: null,
         uploading: false
       };
     },     
    methods: {
       getProgress: function() {
         return this.zipProgress;
       },
       changeFiles: function(e) {
         // this.fileList = e.currentTarget.files;
         // console.log('current target', e.currentTarget);
           Array.from(e.currentTarget.files).forEach(f => {
              this.fileList.push(f);
              this.zipFile.file(f.name, f);
         });
         gaEvent('zipper-changefiles', window.location.pathname); 
       },
       uploadToDropbox: async function() {
          // https://stackoverflow.com/questions/34399049/dropbox-direct-upload-files-from-browser
            if (!this.dropboxService) { // TODO: This isn't the right way to do it!!!!
                console.log('init dropboxService....');
                this.dropboxService = new DropboxService();
              } 
              if (!this.dropboxService.isAuthenticated()) {              
                this.dropboxService.authenticate();
                gaEvent( 'zipfolder-authenticate-dropbox', window.location.pathname);
              } else {
            this.uploading = true;
            if (!this.dropboxService) {
              console.log('init dropboxService....');
              this.dropboxService = new DropboxService();
            }
            
            try {
                await this.dropboxService.uploadFile('ezyZip.zip', this.zipBlob );
                this.uploading = false;
                gaEvent( 'zipfiles-upload-dropbox', window.location.pathname); 
              } catch (ex) {
                alert('Error uploading file to Dropbox');
                this.uploading = false;
                gaEvent( 'zipfiles-upload-dropbox-error', window.location.pathname); 
              }
            gaEvent( 'zipfolder-upload-dropbox', window.location.pathname); 
          }
      },
       changeFolder: function(folderChosen) {         
           if (folderChosen.type == 'folder') {
             Array.from(folderChosen.files).forEach(f => {
              //let file = {name: 'filename', file: f};
              console.log('f is', f);
              this.fileList.push(f);
              this.zipFile.file(f.webkitRelativePath, f);
          });
           } else if (folderChosen.type == 'dropbox-folder') {
             this.done = true;
             this.dropboxFolder = folderChosen; 
           } 
           
         gaEvent('zipper-changefolder', window.location.pathname); 
       },
       saveFile: function() {
         saveFile(this.zipBlob, "ezyzip.zip");                          
         gaEvent('zipper-savefile', window.location.pathname);
       },
       reset: function() {
         this.fileList = [];
         this.loading= false;
           this.done = false;
           this.zipFile= new JSZip();
           this.fileSaved= false;
           this.processingActive= false;
           this.processedFiles= false;
           this.zipBlob= null;
           this.compressionLevel = 0;
           this.zipProgress = 0;
       },
       setCompression: function(e, level) {
           this.compressionLevel = level;
           e.preventDefault();
           gaEvent( 'zipper-level', level);
       },
       zipFiles: function() {
           if (this.fileList.length < 1) {
               return;
           }
           this.processingActive = true;
           let _this = this;
           this.currentFile = this.fileList[0].name;
           let compression = 'DEFLATE';
           let compressionOptions = {level: this.level}
           if (this.compressionLevel === 0) {
               compression = 'STORE';
               compressionOptions = null;
           }
           this.zipFile.generateAsync({type:"blob", compression: compression, compressionOptions: compressionOptions}, m => {
               _this.zipProgress = m.percent;
               _this.currentFile = m.currentFile;
           }).then(function (blob) {
             _this.zipBlob = blob;
             _this.processingActive = false;
             _this.done = true;
           }, function () { // function(err) {
               gaEvent( 'cverror1', window.location.pathname);
               alert('ER1: Error creating zip file');
           });
           gaEvent('zipper-zipfiles', window.location.pathname);
       }
       }
}
