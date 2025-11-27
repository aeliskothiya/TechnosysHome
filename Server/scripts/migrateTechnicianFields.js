import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Technician from '../models/Technician.js';
import TechnicianBankDetails from '../models/TechnicianBankDetails.js';
import TechnicianServiceCategory from '../models/TechnicianServiceCategory.js';

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/technosys';

const migrate = async () => {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const techs = await Technician.find({}).lean();
  console.log(`Found ${techs.length} technicians`);

  let createdBank = 0;
  let createdSvc = 0;

  for (const t of techs) {
    const id = t._id;

    // Migrate bank details if present and no existing bank doc
    if ((t.BankAccountNo || t.IFSCCode) && !(await TechnicianBankDetails.findOne({ TechnicianID: id }))) {
      const bankDoc = new TechnicianBankDetails({
        TechnicianID: id,
        BankAccountNo: t.BankAccountNo || null,
        IFSCCode: t.IFSCCode || null,
      });
      await bankDoc.save();
      createdBank++;
      console.log(`Created bank details for technician ${id}`);
    }

    // Migrate service category if present and no existing mapping
    if (t.ServiceCategoryID && !(await TechnicianServiceCategory.findOne({ TechnicianID: id, ServiceCategoryID: t.ServiceCategoryID }))) {
      const svcDoc = new TechnicianServiceCategory({
        TechnicianID: id,
        ServiceCategoryID: t.ServiceCategoryID,
      });
      await svcDoc.save();
      createdSvc++;
      console.log(`Created service mapping for technician ${id}`);
    }

    // Optionally unset old fields
    const unset = {};
    if (t.BankAccountNo) unset.BankAccountNo = "";
    if (t.IFSCCode) unset.IFSCCode = "";
    if (t.ServiceCategoryID) unset.ServiceCategoryID = "";
    if (Object.keys(unset).length) {
      await Technician.updateOne({ _id: id }, { $unset: unset });
      console.log(`Unset old fields for technician ${id}`);
    }
  }

  console.log(`Migration complete. bank:${createdBank}, service mappings:${createdSvc}`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
